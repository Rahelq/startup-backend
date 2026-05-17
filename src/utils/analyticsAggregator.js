const pool = require("../config/db");

async function snapshotMetric(entityType, entityId, metricType, metricValue, metadata = {}) {
  const res = await pool.query(
    "INSERT INTO analytics_snapshots (entity_type, entity_id, metric_type, metric_value, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [entityType, entityId || null, metricType, metricValue, metadata]
  );
  return res.rows[0];
}

module.exports = { snapshotMetric };
