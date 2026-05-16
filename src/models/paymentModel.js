const pool = require("../config/db");

// Create payment
exports.create = async (paymentData) => {
  const { investmentId, amount, paymentMethod, transactionReference, status, notes } = paymentData;

  const result = await pool.query(
    `INSERT INTO payments (investment_id, amount, payment_method, transaction_reference, status, notes)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
    [investmentId, amount, paymentMethod, transactionReference, status || "pending", notes]
  );

  return result.rows[0];
};

// Get payment by ID
exports.findById = async (paymentId) => {
  const result = await pool.query("SELECT * FROM payments WHERE payment_id = $1", [paymentId]);
  return result.rows[0] || null;
};

// Get all payments for investment
exports.findByInvestmentId = async (investmentId) => {
  const result = await pool.query(
    `SELECT * FROM payments 
		 WHERE investment_id = $1
		 ORDER BY created_at DESC`,
    [investmentId]
  );
  return result.rows;
};

// Get all payments by investor
exports.findByInvestorId = async (investorId) => {
  const result = await pool.query(
    `SELECT p.* FROM payments p
		 JOIN investments i ON i.investment_id = p.investment_id
		 WHERE i.investor_id = $1
		 ORDER BY p.created_at DESC`,
    [investorId]
  );
  return result.rows;
};

// Update payment
exports.update = async (paymentId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(paymentId);

  const result = await pool.query(
    `UPDATE payments SET ${setClause} WHERE payment_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete payment
exports.deleteById = async (paymentId) => {
  const result = await pool.query("DELETE FROM payments WHERE payment_id = $1 RETURNING *", [
    paymentId,
  ]);
  return result.rows[0] || null;
};
