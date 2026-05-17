const pool = require("../config/db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS mentorship_progress (
        progress_id SERIAL PRIMARY KEY,
        mentorship_request_id INTEGER REFERENCES mentorship_requests(mentorship_request_id) ON DELETE CASCADE,
        mentorship_session_id INTEGER REFERENCES mentorship_sessions(mentorship_session_id) ON DELETE SET NULL,
        startup_id INTEGER,
        mentor_id INTEGER,
        progress_notes TEXT,
        progress_rating INTEGER,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS investment_tracking (
        tracking_id SERIAL PRIMARY KEY,
        investment_id INTEGER REFERENCES investment_relationships(investment_id) ON DELETE CASCADE,
        event_type VARCHAR(80),
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS investment_documents (
        investment_id INTEGER REFERENCES investment_relationships(investment_id) ON DELETE CASCADE,
        document_id INTEGER REFERENCES documents(document_id) ON DELETE CASCADE,
        PRIMARY KEY (investment_id, document_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_activity_logs (
        log_id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
        actor_user_id INTEGER,
        action VARCHAR(120),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_mentorship_progress_req ON mentorship_progress(mentorship_request_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_investment_tracking_inv ON investment_tracking(investment_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity_logs(project_id)"
    );

    await client.query("COMMIT");
    console.log("Applied Phase 3 business workflow migration");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("migrate_phase3_business_workflow failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
