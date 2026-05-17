const pool = require("../config/db");

async function createReport(payload) {
  const res = await pool.query(
    "INSERT INTO feedback_reports (rating_id, reported_by, reason, description, status) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [
      payload.rating_id,
      payload.reported_by,
      payload.reason || null,
      payload.description || null,
      payload.status || "pending",
    ]
  );
  return res.rows[0];
}

async function findByRating(ratingId) {
  const res = await pool.query(
    "SELECT * FROM feedback_reports WHERE rating_id = $1 ORDER BY created_at DESC",
    [ratingId]
  );
  return res.rows;
}

async function listReports({ limit = 50, offset = 0, status = null } = {}) {
  const params = [];
  const where = [];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  params.push(Number(limit) || 50);
  params.push(Number(offset) || 0);
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const res = await pool.query(
    `SELECT * FROM feedback_reports ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return res.rows;
}

async function updateReport(id, updates) {
  const sets = [];
  const params = [];
  let idx = 1;
  for (const [k, v] of Object.entries(updates)) {
    sets.push(`${k} = $${idx}`);
    params.push(v);
    idx++;
  }
  params.push(id);
  const res = await pool.query(
    `UPDATE feedback_reports SET ${sets.join(",")} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0];
}

module.exports = { createReport, findByRating, listReports, updateReport };
