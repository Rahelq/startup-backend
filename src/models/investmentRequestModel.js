const pool = require("../config/db");

// Create investment request
exports.create = async (requestData) => {
  const { startupId, investorId, amount, equity, description, status } = requestData;

  const result = await pool.query(
    `INSERT INTO investment_requests (startup_id, investor_id, amount, equity, description, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
    [startupId, investorId, amount, equity, description, status || "pending"]
  );

  return result.rows[0];
};

// Get request by ID
exports.findById = async (requestId) => {
  const result = await pool.query(
    "SELECT * FROM investment_requests WHERE investment_request_id = $1",
    [requestId]
  );
  return result.rows[0] || null;
};

// Get all requests for a startup
exports.findByStartupId = async (startupId) => {
  const result = await pool.query(
    `SELECT * FROM investment_requests 
		 WHERE startup_id = $1
		 ORDER BY created_at DESC`,
    [startupId]
  );
  return result.rows;
};

// Get all requests for an investor
exports.findByInvestorId = async (investorId) => {
  const result = await pool.query(
    `SELECT * FROM investment_requests 
		 WHERE investor_id = $1
		 ORDER BY created_at DESC`,
    [investorId]
  );
  return result.rows;
};

// Update request
exports.update = async (requestId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(requestId);

  const result = await pool.query(
    `UPDATE investment_requests SET ${setClause} WHERE investment_request_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete request
exports.deleteById = async (requestId) => {
  const result = await pool.query(
    "DELETE FROM investment_requests WHERE investment_request_id = $1 RETURNING *",
    [requestId]
  );
  return result.rows[0] || null;
};
