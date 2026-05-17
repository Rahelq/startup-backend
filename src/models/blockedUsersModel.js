const pool = require("../config/db");

exports.block = async (blockerId, blockedId, reason) => {
  const r = await pool.query(
    "INSERT INTO blocked_users (blocker_id, blocked_id, reason) VALUES ($1,$2,$3) ON CONFLICT (blocker_id, blocked_id) DO NOTHING RETURNING *",
    [blockerId, blockedId, reason]
  );
  return r.rows[0] || null;
};

exports.unblock = async (blockerId, blockedId) => {
  const r = await pool.query(
    "DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 RETURNING *",
    [blockerId, blockedId]
  );
  return r.rows[0] || null;
};

exports.findByBlocker = async (blockerId) => {
  const r = await pool.query(
    "SELECT * FROM blocked_users WHERE blocker_id = $1 ORDER BY created_at DESC",
    [blockerId]
  );
  return r.rows;
};
