const pool = require("../config/db");
const realtimeEmitter = require("../utils/realtimeEmitter");

async function getRoleProfiles(mentorUserId, startupUserId) {
  const [mentor, startup] = await Promise.all([
    pool.query("SELECT * FROM mentors WHERE user_id = $1", [mentorUserId]),
    pool.query("SELECT * FROM startups WHERE user_id = $1", [startupUserId]),
  ]);

  return {
    mentor: mentor.rows[0] || null,
    startup: startup.rows[0] || null,
  };
}

async function getMentorshipWithContext(mentorshipId) {
  const result = await pool.query(
    `SELECT
			ir.*,
			m_rel.mentorship_id,
			m_rel.mentorship_request_id,
			m_rel.status AS relationship_status,
			u_mentor.user_id AS mentor_user_id,
			u_mentor.first_name AS mentor_first_name,
			u_mentor.last_name AS mentor_last_name,
			u_mentor.email AS mentor_email,
			u_startup.user_id AS startup_user_id,
			u_startup.first_name AS startup_first_name,
			u_startup.last_name AS startup_last_name,
			u_startup.email AS startup_email,
			m.mentor_id,
			m.expertise,
			m.skills,
			m.industries,
			s.startup_id,
			s.startup_name,
			mp.hourly_rate,
			mp.session_duration_minutes,
			mp.availability_json
		 FROM mentorship_relationships m_rel
		 JOIN interaction_requests ir ON ir.interaction_id = m_rel.interaction_request_id
		 JOIN users u_mentor ON u_mentor.user_id = m_rel.mentor_id
		 JOIN users u_startup ON u_startup.user_id = m_rel.startup_id
		 JOIN mentors m ON m.user_id = u_mentor.user_id
		 JOIN startups s ON s.user_id = u_startup.user_id
		 LEFT JOIN mentorship_pricing mp ON mp.mentor_id = m.mentor_id
		 WHERE m_rel.mentorship_id = $1`,
    [mentorshipId]
  );
  return result.rows[0] || null;
}

function ensureParticipant(mentorship, userId) {
  return (
    mentorship && (mentorship.mentor_user_id === userId || mentorship.startup_user_id === userId)
  );
}

exports.createMentorshipOffer = async ({ userId, role, body }) => {
  const { receiver_id, message, type } = body || {};

  if (!receiver_id) {
    const err = new Error("receiver_id is required");
    err.status = 400;
    throw err;
  }

  const mentorUserId = role === "Mentor" ? userId : Number(receiver_id);
  const startupUserId = role === "Startup" ? userId : Number(receiver_id);
  const { mentor, startup } = await getRoleProfiles(mentorUserId, startupUserId);

  if (!mentor || !startup) {
    const err = new Error("Mentorship workflow requires one Mentor and one Startup profile");
    err.status = 400;
    throw err;
  }

  const interactionRes = await pool.query(
    `INSERT INTO interaction_requests (sender_id, receiver_id, type, category, message)
		 VALUES ($1, $2, $3, 'mentorship', $4)
		 RETURNING interaction_id, sender_id, receiver_id, type, status`,
    [userId, receiver_id, type || "invite", message || null]
  );

  const requestRes = await pool.query(
    `INSERT INTO mentorship_requests (startup_id, mentor_id, subject, message, status)
		 VALUES ($1, $2, $3, $4, 'accepted')
		 RETURNING mentorship_request_id`,
    [
      startup.startup_id,
      mentor.mentor_id,
      type === "request" ? "Mentorship request" : "Mentorship invite",
      message || null,
    ]
  );

  const mentorshipRes = await pool.query(
    `INSERT INTO mentorship_relationships (
			mentor_id, startup_id, interaction_request_id, mentorship_request_id, status
		 )
		 VALUES ($1, $2, $3, $4, 'active')
		 ON CONFLICT (mentor_id, startup_id)
		 DO UPDATE SET
		   interaction_request_id = EXCLUDED.interaction_request_id,
		   mentorship_request_id = EXCLUDED.mentorship_request_id,
		   status = 'active',
		   updated_at = NOW()
		 RETURNING mentorship_id`,
    [
      mentorUserId,
      startupUserId,
      interactionRes.rows[0].interaction_id,
      requestRes.rows[0].mentorship_request_id,
    ]
  );

  await pool.query(
    `INSERT INTO interaction_audit (interaction_id, action, actor_user_id, details)
		 VALUES ($1, 'mentorship_relationship_created', $2, $3)`,
    [interactionRes.rows[0].interaction_id, userId, JSON.stringify({ type: type || "invite" })]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'mentorship', $2, $3, 'mentorship_relationships', $4)`,
    [
      receiver_id,
      type === "request" ? "Mentorship Request" : "Mentorship Invite",
      message || "A mentorship relationship has been created",
      mentorshipRes.rows[0].mentorship_id,
    ]
  );

  return {
    status: 201,
    data: {
      message: "Mentorship workflow started",
      mentorship_id: mentorshipRes.rows[0].mentorship_id,
      interaction_id: interactionRes.rows[0].interaction_id,
    },
  };
};

exports.getMentorshipOffer = async ({ userId, role, mentorshipId }) => {
  const mentorship = await getMentorshipWithContext(mentorshipId);
  if (!mentorship) {
    const err = new Error("Mentorship not found");
    err.status = 404;
    throw err;
  }
  if (!ensureParticipant(mentorship, userId) && role !== "Admin") {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }
  return { status: 200, data: { mentorship } };
};

exports.setMentorPricing = async ({ userId, mentorshipId, body }) => {
  const { hourly_rate, session_duration_minutes, availability_json } = body || {};
  const mentorship = await getMentorshipWithContext(mentorshipId);
  if (!mentorship) {
    const err = new Error("Mentorship not found");
    err.status = 404;
    throw err;
  }
  if (mentorship.mentor_user_id !== userId) {
    const err = new Error("Only mentor can set pricing");
    err.status = 403;
    throw err;
  }

  const rate = Number(hourly_rate);
  const duration = Number(session_duration_minutes || 60);
  if (Number.isNaN(rate) || rate < 0) {
    const err = new Error("hourly_rate must be non-negative");
    err.status = 400;
    throw err;
  }
  if (Number.isNaN(duration) || duration < 15) {
    const err = new Error("session_duration_minutes must be at least 15");
    err.status = 400;
    throw err;
  }

  const pricingRes = await pool.query(
    `INSERT INTO mentorship_pricing (
			mentor_id, hourly_rate, session_duration_minutes, availability_json
		 )
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (mentor_id)
		 DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate,
		               session_duration_minutes = EXCLUDED.session_duration_minutes,
		               availability_json = EXCLUDED.availability_json,
		               updated_at = NOW()
		 RETURNING *`,
    [
      mentorship.mentor_id,
      rate,
      duration,
      availability_json ? JSON.stringify(availability_json) : null,
    ]
  );

  return {
    status: 200,
    data: { message: "Mentor pricing set", pricing: pricingRes.rows[0] },
  };
};

exports.bookSession = async ({ userId, body }) => {
  const { mentorship_id, session_start_at, session_end_at, agenda } = body || {};
  if (!mentorship_id || !session_start_at) {
    const err = new Error("mentorship_id and session_start_at are required");
    err.status = 400;
    throw err;
  }

  const mentorship = await getMentorshipWithContext(mentorship_id);
  if (!mentorship) {
    const err = new Error("Mentorship not found");
    err.status = 404;
    throw err;
  }
  if (mentorship.startup_user_id !== userId) {
    const err = new Error("Only startup can book sessions");
    err.status = 403;
    throw err;
  }

  let mentorshipRequestId = mentorship.mentorship_request_id;
  if (!mentorshipRequestId) {
    const requestRes = await pool.query(
      `INSERT INTO mentorship_requests (startup_id, mentor_id, subject, message, status)
       VALUES ($1, $2, $3, $4, 'accepted')
       RETURNING mentorship_request_id`,
      [
        mentorship.startup_id,
        mentorship.mentor_id,
        "Mentorship session",
        mentorship.message || agenda || null,
      ]
    );

    mentorshipRequestId = requestRes.rows[0].mentorship_request_id;

    await pool.query(
      `UPDATE mentorship_relationships
       SET mentorship_request_id = $1,
           updated_at = NOW()
       WHERE mentorship_id = $2`,
      [mentorshipRequestId, mentorship.mentorship_id]
    );

    mentorship.mentorship_request_id = mentorshipRequestId;
  }

  const start = new Date(session_start_at);
  if (Number.isNaN(start.getTime()) || start < new Date()) {
    const err = new Error("session_start_at must be in the future");
    err.status = 400;
    throw err;
  }

  const duration = Number(mentorship.session_duration_minutes || 60);
  const end = session_end_at
    ? new Date(session_end_at)
    : new Date(start.getTime() + duration * 60000);

  const conflict = await pool.query(
    `SELECT mentorship_session_id
		 FROM mentorship_sessions
		 WHERE mentor_id = $1
		   AND status <> 'cancelled'
		   AND session_start_at < $3
		   AND session_end_at > $2
		 LIMIT 1`,
    [mentorship.mentor_id, start, end]
  );
  if (conflict.rowCount) {
    const err = new Error("Time slot already booked");
    err.status = 409;
    throw err;
  }

  const sessionRes = await pool.query(
    `INSERT INTO mentorship_sessions (
			mentorship_request_id, mentor_id, startup_id, session_date,
			start_time, end_time, scheduled_at, session_start_at, session_end_at,
			duration_minutes, notes, status
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, 'scheduled')
		 RETURNING *`,
    [
      mentorshipRequestId,
      mentorship.mentor_id,
      mentorship.startup_id,
      start.toISOString().slice(0, 10),
      start.toISOString().slice(11, 19),
      end.toISOString().slice(11, 19),
      start,
      end,
      Math.round((end.getTime() - start.getTime()) / 60000),
      agenda || null,
    ]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'mentorship', 'Session Booked', $2, 'mentorship_sessions', $3)`,
    [
      mentorship.mentor_user_id,
      `New mentorship session booked for ${start.toISOString()}`,
      sessionRes.rows[0].mentorship_session_id,
    ]
  );

  realtimeEmitter.emitSessionBooked(
    sessionRes.rows[0].mentorship_session_id,
    mentorship.mentor_user_id,
    mentorship.startup_user_id,
    sessionRes.rows[0]
  );

  return { status: 201, data: { message: "Session booked", session: sessionRes.rows[0] } };
};

exports.getMentorshipSessions = async ({ userId, role, mentorshipId }) => {
  const mentorship = await getMentorshipWithContext(mentorshipId);
  if (!mentorship) {
    const err = new Error("Mentorship not found");
    err.status = 404;
    throw err;
  }
  if (!ensureParticipant(mentorship, userId) && role !== "Admin") {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const sessions = await pool.query(
    `SELECT ms.*
		 FROM mentorship_sessions ms
		 WHERE ms.mentorship_request_id = $1
		 ORDER BY ms.session_start_at ASC`,
    [mentorship.mentorship_request_id]
  );

  return { status: 200, data: { sessions: sessions.rows } };
};

exports.recordSessionNotes = async ({ userId, sessionId, body }) => {
  const { notes, attendance_status, progress_topics } = body || {};
  const sessionRes = await pool.query(
    `SELECT ms.*, mr.mentorship_id, mr.mentor_id AS mentor_user_id, mr.startup_id AS startup_user_id
		 FROM mentorship_sessions ms
		 JOIN mentorship_relationships mr ON mr.mentorship_request_id = ms.mentorship_request_id
		 WHERE ms.mentorship_session_id = $1`,
    [sessionId]
  );
  if (!sessionRes.rowCount) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  const session = sessionRes.rows[0];
  if (session.mentor_user_id !== userId && session.startup_user_id !== userId) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const reportRes = await pool.query(
    `INSERT INTO mentorship_reports (
			mentorship_request_id, mentorship_session_id, startup_id, mentor_id,
			report_title, summary, action_items, mentor_notes
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (mentorship_session_id)
		 DO UPDATE SET summary = EXCLUDED.summary,
		               action_items = EXCLUDED.action_items,
		               mentor_notes = EXCLUDED.mentor_notes
		 RETURNING *`,
    [
      session.mentorship_request_id,
      session.mentorship_session_id,
      session.startup_id,
      session.mentor_id,
      `Session notes - ${new Date().toISOString().slice(0, 10)}`,
      notes || "Session notes recorded",
      JSON.stringify(progress_topics || []),
      attendance_status || null,
    ]
  );

  if (attendance_status === "completed") {
    await pool.query(
      "UPDATE mentorship_sessions SET status = 'completed' WHERE mentorship_session_id = $1",
      [session.mentorship_session_id]
    );
  }

  return {
    status: 200,
    data: { message: "Session notes recorded", report: reportRes.rows[0] },
  };
};

exports.shareResource = async ({ userId, body }) => {
  const { mentorship_id, resource_title, resource_url, resource_type } = body || {};
  const mentorship = await getMentorshipWithContext(mentorship_id);
  if (!mentorship) {
    const err = new Error("Mentorship not found");
    err.status = 404;
    throw err;
  }
  if (mentorship.mentor_user_id !== userId) {
    const err = new Error("Only mentor can share resources");
    err.status = 403;
    throw err;
  }
  if (!resource_title || !resource_url) {
    const err = new Error("resource_title and resource_url are required");
    err.status = 400;
    throw err;
  }

  const resourceRes = await pool.query(
    `INSERT INTO mentorship_resources (
			mentorship_request_id, startup_id, mentor_id, resource_title,
			resource_type, external_url, resource_description
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
    [
      mentorship.mentorship_request_id,
      mentorship.startup_id,
      mentorship.mentor_id,
      resource_title,
      resource_type || "link",
      resource_url,
      resource_type || null,
    ]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'mentorship', 'New Resource', $2, 'mentorship_resources', $3)`,
    [
      mentorship.startup_user_id,
      `New resource shared: ${resource_title}`,
      resourceRes.rows[0].resource_id,
    ]
  );

  return { status: 201, data: { message: "Resource shared", resource: resourceRes.rows[0] } };
};

exports.getMyMentorships = async ({ userId }) => {
  const result = await pool.query(
    `SELECT mr.*, ir.message, s.startup_name,
		        u.first_name AS startup_first_name, u.last_name AS startup_last_name,
		        mp.hourly_rate, mp.session_duration_minutes
		 FROM mentorship_relationships mr
		 JOIN interaction_requests ir ON ir.interaction_id = mr.interaction_request_id
		 JOIN users u ON u.user_id = mr.startup_id
		 JOIN startups s ON s.user_id = mr.startup_id
		 LEFT JOIN mentors m ON m.user_id = mr.mentor_id
		 LEFT JOIN mentorship_pricing mp ON mp.mentor_id = m.mentor_id
		 WHERE mr.mentor_id = $1
		 ORDER BY mr.created_at DESC`,
    [userId]
  );
  return { status: 200, data: { mentorships: result.rows, total_count: result.rowCount } };
};

exports.getReceivedMentorships = async ({ userId }) => {
  const result = await pool.query(
    `SELECT mr.*, ir.message,
		        u.first_name AS mentor_first_name, u.last_name AS mentor_last_name,
		        m.expertise, m.skills, m.industries,
		        mp.hourly_rate, mp.session_duration_minutes
		 FROM mentorship_relationships mr
		 JOIN interaction_requests ir ON ir.interaction_id = mr.interaction_request_id
		 JOIN users u ON u.user_id = mr.mentor_id
		 JOIN mentors m ON m.user_id = mr.mentor_id
		 LEFT JOIN mentorship_pricing mp ON mp.mentor_id = m.mentor_id
		 WHERE mr.startup_id = $1
		 ORDER BY mr.created_at DESC`,
    [userId]
  );
  return { status: 200, data: { mentorships: result.rows, total_count: result.rowCount } };
};

exports.getAllMentorships = async ({ query }) => {
  const { status, limit = 50, offset = 0 } = query || {};
  const params = [];
  let where = "WHERE 1=1";
  if (status) {
    params.push(status);
    where += ` AND mr.status = $${params.length}`;
  }
  params.push(Number(limit) || 50, Number(offset) || 0);

  const result = await pool.query(
    `SELECT mr.*, ir.message,
		        mentor.email AS mentor_email,
		        startup.email AS startup_email,
		        (SELECT COUNT(*) FROM mentorship_sessions ms WHERE ms.mentorship_request_id = mr.mentorship_request_id)::int AS total_sessions
		 FROM mentorship_relationships mr
		 JOIN interaction_requests ir ON ir.interaction_id = mr.interaction_request_id
		 JOIN users mentor ON mentor.user_id = mr.mentor_id
		 JOIN users startup ON startup.user_id = mr.startup_id
		 ${where}
		 ORDER BY mr.created_at DESC
		 LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { status: 200, data: { mentorships: result.rows, total_count: result.rowCount } };
};
