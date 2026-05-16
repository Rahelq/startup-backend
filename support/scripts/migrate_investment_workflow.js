const pool = require("../config/db");

async function migrate() {
	try {
		await pool.query(`
			CREATE TABLE IF NOT EXISTS investor_feedback (
				feedback_id SERIAL PRIMARY KEY,
				investment_request_id INTEGER NOT NULL REFERENCES investment_requests(investment_request_id) ON DELETE CASCADE,
				startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
				investor_id INTEGER NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
				rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
				comment TEXT,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				UNIQUE (investment_request_id, investor_id)
			)
		`);

		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_investor_feedback_startup
			ON investor_feedback (startup_id)
		`);
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_investment_requests_startup
			ON investment_requests (startup_id)
		`);
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_investment_requests_investor
			ON investment_requests (investor_id)
		`);
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_payments_reference
			ON payments (reference_type, reference_id)
		`);

		console.log("Applied investment workflow migration");
	} catch (err) {
		console.error("Investment workflow migration failed:", err.message);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

migrate();
