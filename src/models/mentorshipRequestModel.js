const pool = require("../config/db");

// Create mentorship request
exports.create = async (requestData) => {
  const { startupId, mentorId, subject, message, status } = requestData;

  const result = await pool.query(
    `INSERT INTO mentorship_requests (startup_id, mentor_id, subject, message, status)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING *`,
    [startupId, mentorId, subject, message, status || "pending"]
  );

  return result.rows[0];
};

// Get request by ID
exports.findById = async (requestId) => {
  const result = await pool.query(
    "SELECT * FROM mentorship_requests WHERE mentorship_request_id = $1",
    [requestId]
  );
  return result.rows[0] || null;
};

// Get all requests for a startup
exports.findByStartupId = async (startupId) => {
  const result = await pool.query(
    `SELECT * FROM mentorship_requests 
		 WHERE startup_id = $1
		 ORDER BY created_at DESC`,
    [startupId]
  );
  return result.rows;
};

// Get all requests for a mentor
exports.findByMentorId = async (mentorId) => {
  const result = await pool.query(
    `SELECT * FROM mentorship_requests 
		 WHERE mentor_id = $1
		 ORDER BY created_at DESC`,
    [mentorId]
  );
  return result.rows;
};

// Update request status
exports.updateStatus = async (requestId, status) => {
  const result = await pool.query(
    `UPDATE mentorship_requests SET status = $1 WHERE mentorship_request_id = $2
		 RETURNING *`,
    [status, requestId]
  );
  return result.rows[0] || null;
};

// Delete request
exports.deleteById = async (requestId) => {
  const result = await pool.query(
    "DELETE FROM mentorship_requests WHERE mentorship_request_id = $1 RETURNING *",
    [requestId]
  );
  return result.rows[0] || null;
};
