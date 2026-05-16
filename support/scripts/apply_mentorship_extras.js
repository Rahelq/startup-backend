  const pool = require("../config/db");

async function main() {
	try {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship_reports (
          report_id SERIAL PRIMARY KEY,
          mentorship_request_id INTEGER NOT NULL REFERENCES mentorship_requests(mentorship_request_id) ON DELETE CASCADE,
          mentorship_session_id INTEGER NOT NULL UNIQUE REFERENCES mentorship_sessions(mentorship_session_id) ON DELETE CASCADE,
          startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
          mentor_id INTEGER NOT NULL REFERENCES mentors(mentor_id) ON DELETE CASCADE,
          report_title VARCHAR(255) NOT NULL,
          summary TEXT NOT NULL,
          action_items JSONB,
          next_steps JSONB,
          progress_rating SMALLINT CHECK (progress_rating BETWEEN 1 AND 5),
          startup_feedback TEXT,
          mentor_notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mentorship_resources (
          resource_id SERIAL PRIMARY KEY,
          mentorship_request_id INTEGER NOT NULL REFERENCES mentorship_requests(mentorship_request_id) ON DELETE CASCADE,
          mentorship_session_id INTEGER REFERENCES mentorship_sessions(mentorship_session_id) ON DELETE CASCADE,
          startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
          mentor_id INTEGER NOT NULL REFERENCES mentors(mentor_id) ON DELETE CASCADE,
          resource_title VARCHAR(255) NOT NULL,
          resource_description TEXT,
          resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('file', 'link', 'note')),
          file_name VARCHAR(255),
          file_path TEXT UNIQUE,
          file_type VARCHAR(100),
          file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
          external_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

		console.log("Mentorship extras tables are ready.");
	} catch (err) {
		console.error("Failed to create mentorship extras tables:", err.message);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

main();
