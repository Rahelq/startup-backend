const pool = require("../config/db");

async function migratePaymentsGateway() {
	await pool.query(`
		ALTER TABLE payments
			ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50),
			ADD COLUMN IF NOT EXISTS gateway_tx_ref VARCHAR(255),
			ADD COLUMN IF NOT EXISTS checkout_url TEXT,
			ADD COLUMN IF NOT EXISTS gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
			ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
	`);

	await pool.query(`
		CREATE INDEX IF NOT EXISTS idx_payments_gateway_tx_ref
		ON payments (gateway_tx_ref);
	`);

	console.log("Payments gateway migration completed ✅");
}

migratePaymentsGateway()
	.catch((error) => {
		console.error("Payments gateway migration failed:", error);
		process.exitCode = 1;
	})
	.finally(() => pool.end());
