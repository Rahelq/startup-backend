const pool = require("../config/db");

async function migrate() {
	try {
		console.log("Starting investor parity migration...");

		// Add missing columns to investors table
		console.log("Adding missing columns to investors table...");
		await pool.query(`
			ALTER TABLE investors
			ADD COLUMN IF NOT EXISTS bio TEXT,
			ADD COLUMN IF NOT EXISTS profile_picture TEXT,
			ADD COLUMN IF NOT EXISTS investment_focus JSONB DEFAULT '[]'::jsonb,
			ADD COLUMN IF NOT EXISTS funding_range_min DECIMAL(14,2) CHECK (funding_range_min >= 0),
			ADD COLUMN IF NOT EXISTS funding_range_max DECIMAL(14,2) CHECK (funding_range_max >= 0),
			ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
				CHECK (verification_status IN ('pending', 'approved', 'rejected'))
		`);
		console.log("✓ Investors table updated with new columns");

		// Create investor_documents table
		console.log("Creating investor_documents table...");
		await pool.query(`
			CREATE TABLE IF NOT EXISTS investor_documents (
				investor_document_id SERIAL PRIMARY KEY,
				investor_id INTEGER NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
				document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('portfolio', 'cv', 'agreement', 'other')),
				file_name VARCHAR(255) NOT NULL,
				file_path TEXT NOT NULL UNIQUE,
				file_type VARCHAR(100),
				file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
				description TEXT,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);
		console.log("✓ investor_documents table created");

		// Create indexes for better query performance
		console.log("Creating indexes...");
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_investor_documents_investor
			ON investor_documents (investor_id)
		`);
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_investor_documents_type
			ON investor_documents (document_type)
		`);
		await pool.query(`
			CREATE INDEX IF NOT EXISTS idx_investors_verification_status
			ON investors (verification_status)
		`);
		console.log("✓ Indexes created");

		console.log("✓ Investor parity migration completed successfully");
	} catch (err) {
		console.error("Investor parity migration failed:", err.message);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

migrate();
