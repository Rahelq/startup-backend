const pool = require("../config/db");

async function create(data, client = pool) {
  const result = await client.query(
    `INSERT INTO investment_transactions (
      relationship_id,
      investor_id,
      startup_id,
      offer_id,
      funding_request_id,
      payment_id,
      amount,
      equity_percentage,
      transaction_stage,
      milestone_reference,
      status,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      data.relationship_id,
      data.investor_id,
      data.startup_id,
      data.offer_id || null,
      data.funding_request_id || null,
      data.payment_id || null,
      data.amount,
      data.equity_percentage || null,
      data.transaction_stage,
      data.milestone_reference || null,
      data.status || "pledged",
      data.notes || null,
    ]
  );
  return result.rows[0];
}

async function listForInvestor(investorId) {
  const result = await pool.query(
    "SELECT * FROM investment_transactions WHERE investor_id = $1 ORDER BY created_at DESC",
    [investorId]
  );
  return result.rows;
}

async function listForStartup(startupId) {
  const result = await pool.query(
    "SELECT * FROM investment_transactions WHERE startup_id = $1 ORDER BY created_at DESC",
    [startupId]
  );
  return result.rows;
}

module.exports = {
  create,
  listForInvestor,
  listForStartup,
};
