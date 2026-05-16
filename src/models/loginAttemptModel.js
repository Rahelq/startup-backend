const pool = require("../config/db");

exports.record = async (userId, ipAddress, wasSuccessful, deviceInfo = {}) => {
  const r = await pool.query(
    `INSERT INTO login_attempts (user_id, ip_address, was_successful, device_info, created_at)
     VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
    [userId || null, ipAddress, wasSuccessful, deviceInfo]
  );
  return r.rows[0];
};

exports.findRecentByIp = async (ip, windowMin = 60) => {
  const r = await pool.query(
    `SELECT * FROM login_attempts WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '${windowMin} minutes' ORDER BY created_at DESC`,
    [ip]
  );
  return r.rows;
};
