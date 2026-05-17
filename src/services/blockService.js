const pool = require("../config/db");

async function blockUser(blockerId, blockedId, reason) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "INSERT INTO blocked_users (blocker_id, blocked_id, reason) VALUES ($1,$2,$3) ON CONFLICT (blocker_id, blocked_id) DO NOTHING RETURNING *",
      [blockerId, blockedId, reason]
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

async function unblockUser(blockerId, blockedId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 RETURNING *",
      [blockerId, blockedId]
    );
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

async function listBlocked(blockerId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "SELECT * FROM blocked_users WHERE blocker_id = $1 ORDER BY created_at DESC",
      [blockerId]
    );
    return r.rows;
  } finally {
    client.release();
  }
}

module.exports = { blockUser, unblockUser, listBlocked };
