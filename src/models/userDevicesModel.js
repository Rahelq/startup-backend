const pool = require("../config/db");

exports.create = async (userId, device) => {
  const r = await pool.query(
    `INSERT INTO user_devices (user_id, device_id, device_name, device_type, browser, os, ip_address, location, is_trusted)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING *`,
    [
      userId,
      device.device_id,
      device.device_name,
      device.device_type || "desktop",
      device.browser,
      device.os,
      device.ip_address,
      device.location,
      device.is_trusted || false,
    ]
  );
  return r.rows[0] || null;
};

exports.findByUser = async (userId) => {
  const r = await pool.query(
    "SELECT * FROM user_devices WHERE user_id = $1 ORDER BY last_active_at DESC",
    [userId]
  );
  return r.rows;
};

exports.deleteById = async (userId, id) => {
  const r = await pool.query(
    "DELETE FROM user_devices WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return r.rows[0] || null;
};

exports.updateTrust = async (userId, id, isTrusted) => {
  const r = await pool.query(
    "UPDATE user_devices SET is_trusted = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
    [isTrusted, id, userId]
  );
  return r.rows[0] || null;
};

exports.findByDeviceId = async (deviceId) => {
  const r = await pool.query("SELECT * FROM user_devices WHERE device_id = $1", [deviceId]);
  return r.rows[0] || null;
};
