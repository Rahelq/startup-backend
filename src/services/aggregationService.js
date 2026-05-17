const pool = require("../config/db");
const analyticsAggregator = require("../utils/analyticsAggregator");

async function snapshotPlatformMetrics() {
  // Example: snapshot total users and active users
  const total = await pool.query(
    "SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL"
  );
  const active = await pool.query(
    "SELECT COUNT(*)::int AS active FROM users WHERE is_active = true AND deleted_at IS NULL"
  );
  await analyticsAggregator.snapshotMetric(
    "platform",
    null,
    "users_total",
    total.rows[0].total,
    {}
  );
  await analyticsAggregator.snapshotMetric(
    "platform",
    null,
    "users_active",
    active.rows[0].active,
    {}
  );
  return { total: total.rows[0].total, active: active.rows[0].active };
}

module.exports = { snapshotPlatformMetrics };
