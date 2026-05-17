const pool = require("../config/db");

async function create(data, client = pool) {
  const result = await client.query(
    `INSERT INTO invoices (
      payment_id,
      invoice_number,
      issued_to,
      issued_by,
      amount,
      platform_fee,
      net_amount,
      currency,
      status,
      document_url,
      metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
    RETURNING *`,
    [
      data.payment_id,
      data.invoice_number,
      data.issued_to || null,
      data.issued_by || null,
      data.amount,
      data.platform_fee || 0,
      data.net_amount,
      data.currency || "ETB",
      data.status || "issued",
      data.document_url || null,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function findByPaymentId(paymentId) {
  const result = await pool.query("SELECT * FROM invoices WHERE payment_id = $1", [paymentId]);
  return result.rows[0] || null;
}

module.exports = {
  create,
  findByPaymentId,
};
