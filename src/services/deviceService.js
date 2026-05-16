const pool = require("../config/db");

async function registerDevice(userId, device) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      `INSERT INTO user_devices (user_id, device_id, device_name, device_type, browser, os, ip_address, location, last_active_at, is_trusted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9) ON CONFLICT DO NOTHING RETURNING *`,
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
  } finally {
    client.release();
  }
}

async function listDevices(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "SELECT * FROM user_devices WHERE user_id = $1 ORDER BY last_active_at DESC",
      [userId]
    );
    return r.rows;
  } finally {
    client.release();
  }
}

async function removeDevice(userId, id) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "DELETE FROM user_devices WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

async function trustDevice(userId, id, isTrusted) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "UPDATE user_devices SET is_trusted = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
      [isTrusted, id, userId]
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { registerDevice, listDevices, removeDevice, trustDevice };
