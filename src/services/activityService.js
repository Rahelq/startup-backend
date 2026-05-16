const pool = require("../config/db");
const chatSocket = require("../socket/chatSocket");

exports.recordActivity = async ({
  userId,
  activityType,
  entityType = null,
  entityId = null,
  metadata = null,
}) => {
  const res = await pool.query(
    `INSERT INTO activity_logs (user_id, activity_type, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, activityType, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
  );
  chatSocket.emitActivityCreated(userId, res.rows[0]);
  chatSocket.emitDashboardUpdated(userId, { type: "activity", activity: res.rows[0] });
  return res.rows[0];
};

exports.listActivityForUser = async ({ userId, limit = 50 }) => {
  const q = await pool.query(
    `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, Number(limit) || 50]
  );
  return q.rows;
};

exports.listRecentActivity = async ({ limit = 50 }) => {
  const q = await pool.query(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1`, [
    Number(limit) || 50,
  ]);
  return q.rows;
};
