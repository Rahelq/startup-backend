const pool = require("../config/db");

async function main() {
  await pool.query(`
		ALTER TABLE mentors
			ADD COLUMN IF NOT EXISTS profile_picture TEXT,
			ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
			ADD COLUMN IF NOT EXISTS skills JSONB,
			ADD COLUMN IF NOT EXISTS industries JSONB;
	`);

  try {
    await pool.query(`
			ALTER TABLE mentors
			ADD CONSTRAINT mentors_verification_status_check
			CHECK (verification_status IN ('pending', 'approved', 'rejected'))
		`);
  } catch {}

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mentors_verification_status ON mentors (verification_status)"
  );

  console.log("Applied mentor profile migration");
  await pool.end();
}

main().catch(async (err) => {
  console.error("Mentor profile migration failed:", err.message || err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
