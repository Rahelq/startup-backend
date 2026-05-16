/**
 * Phase 1 — Foundation: users verification/account fields, profile extensions,
 * unified documents metadata (Cloudinary-ready), indexes.
 * Safe to run multiple times (idempotent where possible).
 */
const pool = require("../config/db");

async function addColumn(client, ddl) {
  try {
    await client.query(ddl);
  } catch (e) {
    if (e.code !== "42701") throw e;
  }
}

async function dropConstraintIfExists(client, table, name) {
  await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // --- users ---
    await addColumn(
      client,
      "ALTER TABLE users ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'"
    );
    await addColumn(
      client,
      "ALTER TABLE users ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'active'"
    );
    await addColumn(client, "ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ");
    await addColumn(client, "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(128)");
    await addColumn(client, "ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMPTZ");
    await addColumn(client, "ALTER TABLE users ADD COLUMN profile_submitted_at TIMESTAMPTZ");
    await addColumn(client, "ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ");

    await client.query(`
			UPDATE users SET verification_status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
		`);
    await client.query(`
			UPDATE users SET account_status = CASE WHEN is_active THEN 'active' ELSE 'suspended' END
		`);

    // --- startups (role profile extensions) ---
    await addColumn(client, "ALTER TABLE startups ADD COLUMN startup_tagline VARCHAR(500)");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN stage_type VARCHAR(80)");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN region VARCHAR(120)");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN city VARCHAR(120)");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN founder_role VARCHAR(120)");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN bio TEXT");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN founding_date DATE");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN social_links JSONB");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN pitch_deck_url TEXT");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN profile_image TEXT");
    await addColumn(client, "ALTER TABLE startups ADD COLUMN updated_at TIMESTAMPTZ");

    // --- mentors ---
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN full_name VARCHAR(255)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN expertise_area TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN session_frequency VARCHAR(80)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN preferred_time_slots JSONB");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN previous_mentoring_experience TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN notable_supported TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN key_achievements TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN areas_not_mentoring TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN intro_video_url TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN city VARCHAR(120)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN pricing_notes TEXT");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN current_organization VARCHAR(255)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN \"current_role\" VARCHAR(120)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN format_preference VARCHAR(40)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN primary_industry VARCHAR(120)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN secondary_industry VARCHAR(120)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN linkedin_url VARCHAR(500)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN portfolio_url VARCHAR(500)");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN mentorship_categories JSONB");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN preferred_startup_stages JSONB");
    await addColumn(client, "ALTER TABLE mentors ADD COLUMN updated_at TIMESTAMPTZ");

    // --- investors ---
    await addColumn(client, "ALTER TABLE investors ADD COLUMN firm_name VARCHAR(255)");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN preferred_sector VARCHAR(200)");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN investment_range TEXT");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN portfolio_summary TEXT");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN industries JSONB");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN location_preference VARCHAR(200)");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN website VARCHAR(500)");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN linkedin_url VARCHAR(500)");
    await addColumn(client, "ALTER TABLE investors ADD COLUMN updated_at TIMESTAMPTZ");

    await client.query(`
			UPDATE investors SET firm_name = organization_name WHERE firm_name IS NULL AND organization_name IS NOT NULL
		`);

    // --- documents (global store) ---
    await addColumn(client, "ALTER TABLE documents ADD COLUMN user_id INTEGER");
    try {
      await client.query(`
				ALTER TABLE documents ADD CONSTRAINT documents_user_id_fkey
				FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
			`);
    } catch (e) {
      if (e.code !== "42710") throw e;
    }

    await addColumn(client, "ALTER TABLE documents ADD COLUMN document_type VARCHAR(80)");
    await addColumn(client, "ALTER TABLE documents ADD COLUMN file_url TEXT");
    await addColumn(client, "ALTER TABLE documents ADD COLUMN public_id TEXT");
    await addColumn(client, "ALTER TABLE documents ADD COLUMN original_name VARCHAR(512)");
    await addColumn(client, "ALTER TABLE documents ADD COLUMN mime_type VARCHAR(200)");
    await addColumn(client, "ALTER TABLE documents ADD COLUMN context_type VARCHAR(60)");
    await addColumn(client, "ALTER TABLE documents ADD COLUMN context_id INTEGER");
    await client
      .query("ALTER TABLE documents ALTER COLUMN startup_id DROP NOT NULL")
      .catch(() => {});

    await dropConstraintIfExists(client, "documents", "documents_file_path_key");
    await client
      .query("ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL")
      .catch(() => {});

    await client.query(`
			UPDATE documents d
			SET user_id = s.user_id
			FROM startups s
			WHERE d.startup_id = s.startup_id AND d.user_id IS NULL
		`);

    await client.query(`
			UPDATE documents SET file_url = file_path, original_name = COALESCE(original_name, file_name)
			WHERE file_url IS NULL AND file_path IS NOT NULL AND file_path LIKE 'http%'
		`);

    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)
		`);
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_documents_context ON documents(context_type, context_id)
		`);
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verification_status)
		`);

    await client.query("COMMIT");
    console.log("migrate_phase1_foundation: complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("migrate_phase1_foundation failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
