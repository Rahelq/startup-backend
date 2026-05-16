const pool = require("../config/db");

exports.record = async (
  userId,
  eventType,
  eventSeverity = "low",
  ipAddress = null,
  metadata = {}
) => {
  await pool.query(
    `INSERT INTO security_logs (user_id, event_type, event_severity, ip_address, device_info, location, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [userId, eventType, eventSeverity, ipAddress, null, null, metadata]
  );
};

exports.findRecent = async (limit = 100) => {
  const r = await pool.query("SELECT * FROM security_logs ORDER BY created_at DESC LIMIT $1", [
    limit,
  ]);
  return r.rows;
};
