const pool = require("../config/db");

// Create investment
exports.create = async (investmentData) => {
  const { investmentRequestId, investorId, startupId, amount, equity, investmentType, status } =
    investmentData;

  const result = await pool.query(
    `INSERT INTO investments (investment_request_id, investor_id, startup_id, amount, equity, investment_type, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
    [
      investmentRequestId,
      investorId,
      startupId,
      amount,
      equity,
      investmentType || "equity",
      status || "active",
    ]
  );

  return result.rows[0];
};

// Get investment by ID
exports.findById = async (investmentId) => {
  const result = await pool.query("SELECT * FROM investments WHERE investment_id = $1", [
    investmentId,
  ]);
  return result.rows[0] || null;
};

// Get all investments for an investor
exports.findByInvestorId = async (investorId) => {
  const result = await pool.query(
    `SELECT * FROM investments 
		 WHERE investor_id = $1
		 ORDER BY created_at DESC`,
    [investorId]
  );
  return result.rows;
};

// Get all investments in a startup
exports.findByStartupId = async (startupId) => {
  const result = await pool.query(
    `SELECT * FROM investments 
		 WHERE startup_id = $1
		 ORDER BY created_at DESC`,
    [startupId]
  );
  return result.rows;
};

// Update investment
exports.update = async (investmentId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(investmentId);

  const result = await pool.query(
    `UPDATE investments SET ${setClause} WHERE investment_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete investment
exports.deleteById = async (investmentId) => {
  const result = await pool.query("DELETE FROM investments WHERE investment_id = $1 RETURNING *", [
    investmentId,
  ]);
  return result.rows[0] || null;
};
