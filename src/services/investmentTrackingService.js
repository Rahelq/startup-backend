const pool = require("../config/db");

exports.recordEvent = async ({ userId, investmentId, eventType, details }) => {
  if (!investmentId) throw Object.assign(new Error("investment_id is required"), { status: 400 });

  const r = await pool.query(
    `SELECT investment_id, investor_id, startup_id, status FROM investment_relationships WHERE investment_id = $1 LIMIT 1`,
    [investmentId]
  );
  if (!r.rowCount)
    throw Object.assign(new Error("Investment relationship not found"), { status: 404 });
  const rel = r.rows[0];
  if (rel.status !== "active" && rel.status !== "accepted")
    throw Object.assign(new Error("Investment not active"), { status: 403 });
  if (rel.investor_id !== userId && rel.startup_id !== userId)
    throw Object.assign(new Error("Not a participant"), { status: 403 });

  const res = await pool.query(
    `INSERT INTO investment_tracking (investment_id, event_type, details) VALUES ($1,$2,$3) RETURNING *`,
    [investmentId, eventType || null, details ? JSON.stringify(details) : null]
  );
  return res.rows[0];
};

exports.listEvents = async ({ userId, investmentId }) => {
  if (!investmentId) throw Object.assign(new Error("investment_id is required"), { status: 400 });
  const r = await pool.query(
    `SELECT investment_id, investor_id, startup_id, status FROM investment_relationships WHERE investment_id = $1 LIMIT 1`,
    [investmentId]
  );
  if (!r.rowCount)
    throw Object.assign(new Error("Investment relationship not found"), { status: 404 });
  const rel = r.rows[0];
  if (rel.status !== "active" && rel.status !== "accepted")
    throw Object.assign(new Error("Investment not active"), { status: 403 });
  if (rel.investor_id !== userId && rel.startup_id !== userId)
    throw Object.assign(new Error("Not a participant"), { status: 403 });

  const q = await pool.query(
    `SELECT * FROM investment_tracking WHERE investment_id = $1 ORDER BY created_at DESC`,
    [investmentId]
  );
  return q.rows;
};
