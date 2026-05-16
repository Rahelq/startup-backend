const pool = require("../config/db");
const chatService = require("./chatService");
const notificationService = require("./notificationService");
const videoSessionService = require("./videoSessionService");

function parseInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseTimeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function timeToMinutes(value) {
  const normalized = parseTimeString(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function normalizeAvailabilitySlots(raw) {
  if (raw === undefined || raw === null || raw === "") return [];
  let slots = raw;
  if (typeof raw === "string") {
    try {
      slots = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(slots) && typeof slots === "object") {
    slots = [slots];
  }
  if (!Array.isArray(slots)) {
    throw new Error("Availability must be an array of weekly slots");
  }

  return slots
    .map((slot) => {
      const day = parseInteger(slot.day_of_week ?? slot.dayOfWeek);
      const startTime = parseTimeString(slot.start_time ?? slot.startTime);
      const endTime = parseTimeString(slot.end_time ?? slot.endTime);
      if (day === null || day < 0 || day > 6) {
        throw new Error("Each availability slot needs a day_of_week between 0 and 6");
      }
      if (!startTime || !endTime) {
        throw new Error("Each availability slot needs valid start_time and end_time");
      }
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        throw new Error("Availability slot end_time must be after start_time");
      }
      return {
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      };
    })
    .sort((left, right) => {
      if (left.day_of_week !== right.day_of_week) {
        return left.day_of_week - right.day_of_week;
      }
      return timeToMinutes(left.start_time) - timeToMinutes(right.start_time);
    });
}

function sessionWindowFromStartAndDuration(startAt, durationMinutes) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    throw new Error("scheduled_at must be a valid datetime");
  }
  if (start.getTime() < Date.now()) {
    throw new Error("scheduled_at cannot be in the past");
  }
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error("duration_minutes must be a positive integer");
  }
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return {
    start,
    end,
    date: start.toISOString().slice(0, 10),
    start_time: start.toISOString().slice(11, 19),
    end_time: end.toISOString().slice(11, 19),
    duration_minutes: duration,
  };
}

function availabilityCoversSession(availability, startAt, endAt) {
  if (!availability || !availability.length) return false;
  if (startAt.toISOString().slice(0, 10) !== endAt.toISOString().slice(0, 10)) {
    return false;
  }

  const dayOfWeek = startAt.getUTCDay();
  const startMinutes = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();
  const endMinutes = endAt.getUTCHours() * 60 + endAt.getUTCMinutes();

  return availability.some((slot) => {
    if (slot.day_of_week !== dayOfWeek) return false;
    const slotStart = timeToMinutes(slot.start_time);
    const slotEnd = timeToMinutes(slot.end_time);
    return slotStart <= startMinutes && slotEnd >= endMinutes;
  });
}

async function getMentorUserId(mentorId) {
  const result = await pool.query("SELECT user_id FROM mentors WHERE mentor_id = $1", [mentorId]);
  return result.rowCount ? result.rows[0].user_id : null;
}

async function getStartupUserId(startupId) {
  const result = await pool.query("SELECT user_id FROM startups WHERE startup_id = $1", [
    startupId,
  ]);
  return result.rowCount ? result.rows[0].user_id : null;
}

async function getMentorProfileByUserId(userId) {
  const result = await pool.query(
    "SELECT mentor_id, user_id, availability FROM mentors WHERE user_id = $1",
    [userId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function getMentorAvailabilityByMentorId(mentorId) {
  const result = await pool.query(
    "SELECT mentor_id, availability FROM mentors WHERE mentor_id = $1",
    [mentorId]
  );
  if (!result.rowCount) return null;
  return {
    mentor_id: result.rows[0].mentor_id,
    availability: normalizeAvailabilitySlots(result.rows[0].availability || []),
  };
}

async function updateMentorAvailability(userId, rawAvailability) {
  const mentor = await getMentorProfileByUserId(userId);
  if (!mentor) {
    const error = new Error("Mentor profile not found");
    error.statusCode = 404;
    throw error;
  }

  const availability = normalizeAvailabilitySlots(rawAvailability);
  const result = await pool.query(
    "UPDATE mentors SET availability = $1 WHERE mentor_id = $2 RETURNING mentor_id, availability",
    [JSON.stringify(availability), mentor.mentor_id]
  );
  return {
    mentor_id: result.rows[0].mentor_id,
    availability: result.rows[0].availability,
  };
}

async function getAcceptedMentorshipPair(mentorshipRequestId, mentorId, startupId) {
  const result = await pool.query(
    `SELECT mr.mentorship_request_id, mr.status, mr.startup_id, mr.mentor_id
		 FROM mentorship_requests mr
		 WHERE mr.mentorship_request_id = $1
		 LIMIT 1`,
    [mentorshipRequestId]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  if (row.mentor_id !== mentorId || row.startup_id !== startupId) return null;
  if (row.status !== "accepted") return null;
  return row;
}

async function getSessionConflictRows(
  mentorId,
  startupId,
  startAt,
  endAt,
  excludeSessionId = null
) {
  const params = [mentorId, startupId, startAt.toISOString(), endAt.toISOString()];
  let query = `
		SELECT mentorship_session_id, mentor_id, startup_id, status, session_start_at, session_end_at
		FROM mentorship_sessions
		WHERE status IN ('pending', 'confirmed', 'scheduled')
		  AND (
			mentor_id = $1
			OR startup_id = $2
		  )
		  AND COALESCE(session_start_at, scheduled_at) < $4
		  AND COALESCE(session_end_at, scheduled_at + (duration_minutes * INTERVAL '1 minute')) > $3
	`;
  if (excludeSessionId) {
    params.push(excludeSessionId);
    query += " AND mentorship_session_id <> $5";
  }
  const result = await pool.query(query, params);
  return result.rows;
}

async function createLinkedSession({
  mentorshipRequestId,
  mentorId,
  startupId,
  bookedByUserId,
  scheduledAt,
  durationMinutes,
  topic,
  createZoom = true,
}) {
  const pair = await getAcceptedMentorshipPair(mentorshipRequestId, mentorId, startupId);
  if (!pair) {
    const error = new Error("Mentorship request must be accepted for booking");
    error.statusCode = 409;
    throw error;
  }

  const mentorAvailability = await getMentorAvailabilityByMentorId(mentorId);
  if (!mentorAvailability || !mentorAvailability.availability.length) {
    const error = new Error("Mentor availability is not configured");
    error.statusCode = 409;
    throw error;
  }

  const window = sessionWindowFromStartAndDuration(scheduledAt, durationMinutes);
  if (!availabilityCoversSession(mentorAvailability.availability, window.start, window.end)) {
    const error = new Error("Selected time is outside mentor availability");
    error.statusCode = 409;
    throw error;
  }

  const conflicts = await getSessionConflictRows(mentorId, startupId, window.start, window.end);
  if (conflicts.length) {
    const error = new Error("Mentor or startup already has an overlapping session");
    error.statusCode = 409;
    error.details = conflicts;
    throw error;
  }

  const mentorUserId = await getMentorUserId(mentorId);
  const startupUserId = await getStartupUserId(startupId);
  if (!mentorUserId || !startupUserId) {
    const error = new Error("Unable to resolve mentor or startup user account");
    error.statusCode = 404;
    throw error;
  }

  const conversation = await chatService.createConversation(
    mentorUserId,
    startupUserId,
    "mentor_chat"
  );

  const videoSession = await videoSessionService.createSession({
    host_id: mentorUserId,
    participant_id: startupUserId,
    scheduled_at: window.start.toISOString(),
    duration: window.duration_minutes,
    topic,
    conversation_id: conversation.conversation_id,
    create_zoom: Boolean(createZoom),
  });

  const result = await pool.query(
    `INSERT INTO mentorship_sessions (
			mentorship_request_id,
			mentor_id,
			startup_id,
			session_date,
			start_time,
			end_time,
			scheduled_at,
			session_start_at,
			session_end_at,
			duration_minutes,
			status,
			conversation_id,
			video_session_id,
			meeting_link,
			booked_by_user_id,
			confirmed_at,
			created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NULL, NOW())
		RETURNING *`,
    [
      mentorshipRequestId,
      mentorId,
      startupId,
      window.date,
      window.start_time,
      window.end_time,
      window.start.toISOString(),
      window.start.toISOString(),
      window.end.toISOString(),
      window.duration_minutes,
      "pending",
      conversation.conversation_id,
      videoSession.id,
      videoSession.meeting_link || null,
      bookedByUserId,
    ]
  );

  return {
    mentorship_session: result.rows[0],
    conversation,
    video_session: videoSession,
  };
}

async function getSessionById(sessionId) {
  const result = await pool.query(
    `SELECT ms.*, mr.subject
		 FROM mentorship_sessions ms
		 JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
		 WHERE ms.mentorship_session_id = $1`,
    [sessionId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function postSessionChatMessage(session, message) {
  if (!session || !session.conversation_id) return null;
  const mentorUserId = await getMentorUserId(session.mentor_id);
  const startupUserId = await getStartupUserId(session.startup_id);
  if (!mentorUserId || !startupUserId) return null;
  return chatService.sendMessage({
    conversationId: session.conversation_id,
    senderId: mentorUserId,
    receiverId: startupUserId,
    message,
    messageType: "system",
  });
}

async function rescheduleSession({ sessionId, scheduledAt, durationMinutes }) {
  const current = await getSessionById(sessionId);
  if (!current) {
    const error = new Error("Mentorship session not found");
    error.statusCode = 404;
    throw error;
  }

  const window = sessionWindowFromStartAndDuration(
    scheduledAt || current.scheduled_at,
    durationMinutes || current.duration_minutes
  );

  const mentorAvailability = await getMentorAvailabilityByMentorId(current.mentor_id);
  if (!availabilityCoversSession(mentorAvailability.availability, window.start, window.end)) {
    const error = new Error("Selected time is outside mentor availability");
    error.statusCode = 409;
    throw error;
  }

  const conflicts = await getSessionConflictRows(
    current.mentor_id,
    current.startup_id,
    window.start,
    window.end,
    sessionId
  );
  if (conflicts.length) {
    const error = new Error("Mentor or startup already has an overlapping session");
    error.statusCode = 409;
    throw error;
  }

  if (current.video_session_id) {
    const videoResult = await pool.query("SELECT * FROM video_sessions WHERE id = $1 LIMIT 1", [
      current.video_session_id,
    ]);
    const linkedVideo = videoResult.rows[0];
    if (linkedVideo && linkedVideo.meeting_id && linkedVideo.provider === "zoom") {
      try {
        await videoSessionService.updateZoomMeeting(linkedVideo.meeting_id, {
          topic: `Mentorship session ${current.mentor_id} → ${current.startup_id}`,
          start_time: window.start.toISOString(),
          duration: window.duration_minutes,
        });
      } catch (err) {
        console.warn("Zoom reschedule failed, continuing local update:", err.message || err);
      }
    }
    await pool.query("UPDATE video_sessions SET scheduled_at = $1, duration = $2 WHERE id = $3", [
      window.start.toISOString(),
      window.duration_minutes,
      current.video_session_id,
    ]);
  }

  const result = await pool.query(
    `UPDATE mentorship_sessions
		 SET session_date = $1,
		     start_time = $2,
		     end_time = $3,
		     scheduled_at = $4,
		     session_start_at = $4,
		     session_end_at = $7,
		     duration_minutes = $5,
		     updated_at = NOW()
		 WHERE mentorship_session_id = $6
		 RETURNING *`,
    [
      window.date,
      window.start_time,
      window.end_time,
      window.start.toISOString(),
      window.duration_minutes,
      sessionId,
      window.end.toISOString(),
    ]
  );
  await postSessionChatMessage(
    result.rows[0],
    `Mentorship session rescheduled to ${window.start.toLocaleString()}.`
  );

  return result.rows[0];
}

async function confirmSession(sessionId) {
  const current = await getSessionById(sessionId);
  if (!current) {
    const error = new Error("Mentorship session not found");
    error.statusCode = 404;
    throw error;
  }

  const result = await pool.query(
    `UPDATE mentorship_sessions
		 SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, NOW()), updated_at = NOW()
		 WHERE mentorship_session_id = $1
		 RETURNING *`,
    [sessionId]
  );
  await postSessionChatMessage(result.rows[0], "Mentorship session confirmed.");
  return result.rows[0];
}

async function cancelSession(sessionId) {
  const current = await getSessionById(sessionId);
  if (!current) {
    const error = new Error("Mentorship session not found");
    error.statusCode = 404;
    throw error;
  }

  if (current.video_session_id) {
    const videoResult = await pool.query("SELECT * FROM video_sessions WHERE id = $1 LIMIT 1", [
      current.video_session_id,
    ]);
    const linkedVideo = videoResult.rows[0];
    if (linkedVideo && linkedVideo.meeting_id && linkedVideo.provider === "zoom") {
      try {
        await videoSessionService.deleteZoomMeeting(linkedVideo.meeting_id);
      } catch (err) {
        console.warn("Zoom cancel failed, continuing local update:", err.message || err);
      }
    }
    await pool.query("UPDATE video_sessions SET status = 'cancelled' WHERE id = $1", [
      current.video_session_id,
    ]);
  }

  const result = await pool.query(
    `UPDATE mentorship_sessions
		 SET status = 'cancelled', updated_at = NOW()
		 WHERE mentorship_session_id = $1
		 RETURNING *`,
    [sessionId]
  );
  await postSessionChatMessage(result.rows[0], "Mentorship session cancelled.");
  return result.rows[0];
}

async function listSessionsForUser(userId) {
  const result = await pool.query(
    `SELECT ms.*, mr.subject
		 FROM mentorship_sessions ms
		 JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
		 WHERE ms.mentor_id = (SELECT mentor_id FROM mentors WHERE user_id = $1)
		    OR ms.startup_id = (SELECT startup_id FROM startups WHERE user_id = $1)
		 ORDER BY COALESCE(ms.session_start_at, ms.scheduled_at) DESC`,
    [userId]
  );
  return result.rows;
}

async function sendSessionNotifications(session, title, message, notificationType) {
  const mentorUserId = await getMentorUserId(session.mentor_id);
  const startupUserId = await getStartupUserId(session.startup_id);
  const referenceId = session.mentorship_session_id;
  const recipients = [mentorUserId, startupUserId].filter((userId) => {
    const parsed = Number(userId);
    return Number.isInteger(parsed) && parsed > 0;
  });
  for (const userId of recipients) {
    await notificationService.createNotification({
      userId,
      notificationType,
      title,
      message,
      referenceType: "mentorship_session",
      referenceId,
    });
  }
}

module.exports = {
  normalizeAvailabilitySlots,
  sessionWindowFromStartAndDuration,
  availabilityCoversSession,
  getMentorAvailabilityByMentorId,
  updateMentorAvailability,
  createLinkedSession,
  getSessionById,
  rescheduleSession,
  confirmSession,
  cancelSession,
  listSessionsForUser,
  sendSessionNotifications,
  getSessionConflictRows,
  getAcceptedMentorshipPair,
  getMentorUserId,
  getStartupUserId,
};
