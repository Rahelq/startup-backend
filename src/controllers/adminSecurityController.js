const pool = require("../config/db");
const securityLogService = require("../services/securityLogService");

async function listSecurityLogs(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const r = await pool.query(
      "SELECT * FROM security_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

async function listSuspiciousUsers(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT user_id, COUNT(*) AS failures, MAX(created_at) AS last_attempt FROM login_attempts WHERE success = false GROUP BY user_id ORDER BY failures DESC LIMIT 100`
    );
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

async function listActiveSessions(req, res, next) {
  try {
    const r = await pool.query(
      "SELECT * FROM user_sessions WHERE is_revoked = false ORDER BY last_activity_at DESC LIMIT $1",
      [Number(req.query.limit) || 100]
    );
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

async function revokeSessionAdmin(req, res, next) {
  try {
    const sessionId = Number(req.params.id);
    const r = await pool.query(
      "UPDATE user_sessions SET is_revoked = true WHERE id = $1 RETURNING *",
      [sessionId]
    );
    res.json({ data: r.rows[0] || null });
  } catch (err) {
    next(err);
  }
}

async function getSecurityAnalytics(req, res, next) {
  try {
    const last24 = "NOW() - INTERVAL '24 hours'";
    const q = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM login_attempts WHERE success = true AND created_at > ${last24})::int AS total_logins_last_24h,
        (SELECT COUNT(*) FROM login_attempts WHERE success = false AND created_at > ${last24})::int AS failed_logins_last_24h,
        (SELECT COUNT(DISTINCT user_id) FROM login_attempts WHERE success = false AND created_at > ${last24})::int AS unique_failed_users_24h,
        (SELECT COUNT(*) FROM user_sessions WHERE is_revoked = false)::int AS active_sessions_count
      `
    );

    const topDevices = await pool.query(
      `SELECT device_info, COUNT(*) AS count FROM login_attempts WHERE device_info IS NOT NULL GROUP BY device_info ORDER BY count DESC LIMIT 10`
    );

    res.json({ data: { ...q.rows[0], topDevices: topDevices.rows } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSecurityLogs,
  listSuspiciousUsers,
  listActiveSessions,
  revokeSessionAdmin,
  getSecurityAnalytics,
};
