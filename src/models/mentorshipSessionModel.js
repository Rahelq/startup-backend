const pool = require("../config/db");

// Create mentorship session
exports.create = async (sessionData) => {
  const { mentorshipRequestId, startupId, mentorId, sessionDate, duration, status, notes } =
    sessionData;

  const result = await pool.query(
    `INSERT INTO mentorship_sessions (mentorship_request_id, startup_id, mentor_id, session_date, duration, status, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
    [mentorshipRequestId, startupId, mentorId, sessionDate, duration, status || "scheduled", notes]
  );

  return result.rows[0];
};

// Get session by ID
exports.findById = async (sessionId) => {
  const result = await pool.query(
    "SELECT * FROM mentorship_sessions WHERE mentorship_session_id = $1",
    [sessionId]
  );
  return result.rows[0] || null;
};

// Get all sessions for mentor
exports.findByMentorId = async (mentorId) => {
  const result = await pool.query(
    `SELECT * FROM mentorship_sessions 
		 WHERE mentor_id = $1
		 ORDER BY session_date DESC`,
    [mentorId]
  );
  return result.rows;
};

// Get all sessions for startup
exports.findByStartupId = async (startupId) => {
  const result = await pool.query(
    `SELECT * FROM mentorship_sessions 
		 WHERE startup_id = $1
		 ORDER BY session_date DESC`,
    [startupId]
  );
  return result.rows;
};

// Update session
exports.update = async (sessionId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(sessionId);

  const result = await pool.query(
    `UPDATE mentorship_sessions SET ${setClause} WHERE mentorship_session_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete session
exports.deleteById = async (sessionId) => {
  const result = await pool.query(
    "DELETE FROM mentorship_sessions WHERE mentorship_session_id = $1 RETURNING *",
    [sessionId]
  );
  return result.rows[0] || null;
};
