const pool = require("../config/db");

async function recordEvent(
  userId,
  event_type,
  event_severity = "low",
  ip_address = null,
  metadata = {}
) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO security_logs (user_id, event_type, event_severity, ip_address, device_info, location, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [userId, event_type, event_severity, ip_address, null, null, metadata]
    );
  } finally {
    client.release();
  }
}

module.exports = { recordEvent };
