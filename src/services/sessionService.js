const pool = require("../config/db");
const crypto = require("crypto");

async function createSession({ userId, deviceId, ip, location, expiresAt, refreshToken }) {
  const client = await pool.connect();
  try {
    const hash = refreshToken
      ? crypto.createHash("sha256").update(refreshToken).digest("hex")
      : null;
    const r = await client.query(
      `INSERT INTO user_sessions (user_id, device_id, refresh_token_hash, ip_address, location, expires_at, last_activity_at, is_revoked, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),false,NOW()) RETURNING *`,
      [userId, deviceId || null, hash, ip || null, location || null, expiresAt || null]
    );
    return r.rows[0];
  } finally {
    client.release();
  }
}

async function listSessions(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "SELECT * FROM user_sessions WHERE user_id = $1 ORDER BY last_activity_at DESC",
      [userId]
    );
    return r.rows;
  } finally {
    client.release();
  }
}

async function revokeSession(userId, sessionId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "UPDATE user_sessions SET is_revoked = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [sessionId, userId]
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

async function revokeAllSessions(userId) {
  const client = await pool.connect();
  try {
    await client.query("UPDATE user_sessions SET is_revoked = true WHERE user_id = $1", [userId]);
    return true;
  } finally {
    client.release();
  }
}

module.exports = { createSession, listSessions, revokeSession, revokeAllSessions };
