const pool = require("../config/db");

async function createRating(payload) {
  const cols = [];
  const vals = [];
  const params = [];
  let idx = 1;
  for (const [k, v] of Object.entries(payload)) {
    cols.push(k);
    vals.push(`$${idx}`);
    params.push(v);
    idx++;
  }
  const q = `INSERT INTO ratings (${cols.join(",")}) VALUES (${vals.join(",")}) RETURNING *`;
  const res = await pool.query(q, params);
  return res.rows[0];
}

async function findById(id) {
  const res = await pool.query("SELECT * FROM ratings WHERE id = $1", [id]);
  return res.rows[0];
}

async function findByEntity(entityType, entityId, { limit = 50, offset = 0 } = {}) {
  const res = await pool.query(
    "SELECT * FROM ratings WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
    [entityType, entityId, Number(limit) || 50, Number(offset) || 0]
  );
  return res.rows;
}

async function findByReviewer(reviewerId, { limit = 50, offset = 0 } = {}) {
  const res = await pool.query(
    "SELECT * FROM ratings WHERE reviewer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [reviewerId, Number(limit) || 50, Number(offset) || 0]
  );
  return res.rows;
}

async function listRatings({ limit = 50, offset = 0, status = null, entityType = null } = {}) {
  const params = [];
  const where = [];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (entityType) {
    params.push(entityType);
    where.push(`entity_type = $${params.length}`);
  }
  params.push(Number(limit) || 50);
  params.push(Number(offset) || 0);
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const res = await pool.query(
    `SELECT * FROM ratings ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return res.rows;
}

async function updateRating(id, updates) {
  const sets = [];
  const params = [];
  let idx = 1;
  for (const [k, v] of Object.entries(updates)) {
    sets.push(`${k} = $${idx}`);
    params.push(v);
    idx++;
  }
  params.push(id);
  const q = `UPDATE ratings SET ${sets.join(",")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
  const res = await pool.query(q, params);
  return res.rows[0];
}

async function findRecentForUser(userId, { limit = 20 } = {}) {
  const res = await pool.query(
    "SELECT * FROM ratings WHERE reviewed_user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, Number(limit) || 20]
  );
  return res.rows;
}

async function countByReviewedUser(userId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS total, AVG(rating)::numeric(4,2) AS average_rating
     FROM ratings
     WHERE reviewed_user_id = $1 AND status = 'active'`,
    [userId]
  );
  return res.rows[0] || { total: 0, average_rating: 0 };
}

module.exports = {
  createRating,
  findById,
  findByEntity,
  findByReviewer,
  listRatings,
  updateRating,
  findRecentForUser,
  countByReviewedUser,
};
