const pool = require("../config/db");

exports.findByUser = async (userId) => {
  const r = await pool.query("SELECT * FROM user_settings WHERE user_id = $1", [userId]);
  return r.rows[0] || null;
};

exports.upsert = async (userId, values) => {
  const cols = Object.keys(values);
  if (cols.length === 0) return exports.findByUser(userId);
  const params = [userId, ...cols.map((k) => values[k])];
  const updates = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const sql = `INSERT INTO user_settings (user_id, ${cols.join(",")}) VALUES ($1, ${cols
    .map((_, i) => `$${i + 2}`)
    .join(",")}) ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = NOW() RETURNING *`;
  const r = await pool.query(sql, params);
  return r.rows[0];
};
