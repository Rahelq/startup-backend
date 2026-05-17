const pool = require("../config/db");

async function create(
  { paymentId, action, performedBy, oldStatus = null, newStatus = null, notes = null },
  client = pool
) {
  const result = await client.query(
    `INSERT INTO financial_audit_logs (payment_id, action, performed_by, old_status, new_status, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [paymentId, action, performedBy || null, oldStatus, newStatus, notes]
  );
  return result.rows[0];
}

async function listByPayment(paymentId) {
  const result = await pool.query(
    "SELECT * FROM financial_audit_logs WHERE payment_id = $1 ORDER BY created_at DESC",
    [paymentId]
  );
  return result.rows;
}

module.exports = {
  create,
  listByPayment,
};
