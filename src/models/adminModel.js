const pool = require("../config/db");

// Get admin by ID
exports.findById = async (adminId) => {
  const result = await pool.query("SELECT * FROM admins WHERE admin_id = $1", [adminId]);
  return result.rows[0] || null;
};

// Get admin by user ID
exports.findByUserId = async (userId) => {
  const result = await pool.query("SELECT * FROM admins WHERE user_id = $1", [userId]);
  return result.rows[0] || null;
};

// Create admin
exports.create = async (userId, privilegeLevel) => {
  const result = await pool.query(
    `INSERT INTO admins (user_id, privilege_level)
		 VALUES ($1, $2)
		 RETURNING *`,
    [userId, privilegeLevel || 1]
  );
  return result.rows[0];
};

// Update admin
exports.update = async (adminId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(adminId);

  const result = await pool.query(
    `UPDATE admins SET ${setClause} WHERE admin_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Get all admins
exports.findAll = async () => {
  const result = await pool.query("SELECT * FROM admins ORDER BY created_at DESC");
  return result.rows;
};

// Delete admin
exports.deleteById = async (adminId) => {
  const result = await pool.query("DELETE FROM admins WHERE admin_id = $1 RETURNING *", [adminId]);
  return result.rows[0] || null;
};
