const pool = require("../config/db");

// Create audit log
exports.create = async (logData) => {
  const { userId, action, entityType, entityId, changes, ipAddress, userAgent } = logData;

  const result = await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
    [userId, action, entityType, entityId, changes, ipAddress, userAgent]
  );

  return result.rows[0];
};

// Get audit log by ID
exports.findById = async (logId) => {
  const result = await pool.query("SELECT * FROM audit_logs WHERE audit_log_id = $1", [logId]);
  return result.rows[0] || null;
};

// Get all logs for a user
exports.findByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Get all logs for an entity
exports.findByEntity = async (entityType, entityId) => {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
		 WHERE entity_type = $1 AND entity_id = $2
		 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
};

// Get all audit logs
exports.findAll = async (limit = 100, offset = 0) => {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
		 ORDER BY created_at DESC
		 LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
};

// Delete audit log
exports.deleteById = async (logId) => {
  const result = await pool.query("DELETE FROM audit_logs WHERE audit_log_id = $1 RETURNING *", [
    logId,
  ]);
  return result.rows[0] || null;
};
