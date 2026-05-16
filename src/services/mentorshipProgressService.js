const pool = require("../config/db");

exports.recordProgress = async ({
  userId,
  mentorshipRequestId,
  mentorshipSessionId,
  notes,
  rating,
  metadata,
}) => {
  if (!mentorshipRequestId) {
    const err = new Error("mentorship_request_id is required");
    err.status = 400;
    throw err;
  }

  const rel = await pool.query(
    `SELECT mentorship_id, mentor_id, startup_id, status FROM mentorship_relationships WHERE mentorship_request_id = $1 LIMIT 1`,
    [mentorshipRequestId]
  );
  if (!rel.rowCount) {
    const err = new Error("Mentorship relationship not found");
    err.status = 404;
    throw err;
  }
  const r = rel.rows[0];
  if (r.status !== "active") {
    const err = new Error("Mentorship relationship is not active");
    err.status = 403;
    throw err;
  }
  if (r.mentor_id !== userId && r.startup_id !== userId) {
    const err = new Error("Not a participant in this mentorship");
    err.status = 403;
    throw err;
  }

  const res = await pool.query(
    `INSERT INTO mentorship_progress (
      mentorship_request_id, mentorship_session_id, startup_id, mentor_id, progress_notes, progress_rating, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      mentorshipRequestId,
      mentorshipSessionId || null,
      r.startup_id,
      r.mentor_id,
      notes || null,
      rating || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  return res.rows[0];
};

exports.listProgressForMentorship = async ({ userId, mentorshipRequestId }) => {
  if (!mentorshipRequestId) {
    const err = new Error("mentorship_request_id is required");
    err.status = 400;
    throw err;
  }

  const rel = await pool.query(
    `SELECT mentorship_id, mentor_id, startup_id, status FROM mentorship_relationships WHERE mentorship_request_id = $1 LIMIT 1`,
    [mentorshipRequestId]
  );
  if (!rel.rowCount) {
    const err = new Error("Mentorship relationship not found");
    err.status = 404;
    throw err;
  }
  const r = rel.rows[0];
  if (r.status !== "active") {
    const err = new Error("Mentorship relationship is not active");
    err.status = 403;
    throw err;
  }
  if (r.mentor_id !== userId && r.startup_id !== userId) {
    const err = new Error("Not a participant in this mentorship");
    err.status = 403;
    throw err;
  }

  const q = await pool.query(
    `SELECT * FROM mentorship_progress WHERE mentorship_request_id = $1 ORDER BY created_at DESC`,
    [mentorshipRequestId]
  );
  return q.rows;
};
