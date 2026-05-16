const pool = require("../config/db");

async function up() {
  await pool.query(`
		ALTER TABLE mentorship_sessions
			ADD COLUMN IF NOT EXISTS mentor_id INTEGER REFERENCES mentors(mentor_id) ON DELETE CASCADE,
			ADD COLUMN IF NOT EXISTS startup_id INTEGER REFERENCES startups(startup_id) ON DELETE CASCADE,
			ADD COLUMN IF NOT EXISTS session_date DATE,
			ADD COLUMN IF NOT EXISTS start_time TIME,
			ADD COLUMN IF NOT EXISTS end_time TIME,
			ADD COLUMN IF NOT EXISTS session_start_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS session_end_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE SET NULL,
			ADD COLUMN IF NOT EXISTS video_session_id INTEGER REFERENCES video_sessions(id) ON DELETE SET NULL,
			ADD COLUMN IF NOT EXISTS booked_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
			ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	`);

  await pool.query(`
		ALTER TABLE mentors
			ALTER COLUMN availability TYPE JSONB
			USING (
				CASE
					WHEN availability IS NULL THEN '[]'::jsonb
					WHEN availability::text ~ '^\\s*[\\[\\{]'
						THEN availability::jsonb
					ELSE '[]'::jsonb
				END
			)
	`);

  try {
    await pool.query(
      "ALTER TABLE mentorship_sessions DROP CONSTRAINT IF EXISTS mentorship_sessions_status_check"
    );
  } catch {}

  await pool.query(`
		UPDATE mentorship_sessions ms
		SET mentor_id = COALESCE(ms.mentor_id, mr.mentor_id),
			startup_id = COALESCE(ms.startup_id, mr.startup_id),
			session_date = COALESCE(ms.session_date, ms.scheduled_at::date),
			start_time = COALESCE(ms.start_time, ms.scheduled_at::time),
			end_time = COALESCE(ms.end_time, (ms.scheduled_at + (ms.duration_minutes * INTERVAL '1 minute'))::time),
			session_start_at = COALESCE(ms.session_start_at, ms.scheduled_at),
			session_end_at = COALESCE(ms.session_end_at, ms.scheduled_at + (ms.duration_minutes * INTERVAL '1 minute')),
			updated_at = NOW()
		FROM mentorship_requests mr
		WHERE mr.mentorship_request_id = ms.mentorship_request_id;
	`);

  await pool.query("UPDATE mentorship_sessions SET status = 'pending' WHERE status = 'scheduled'");

  await pool.query("ALTER TABLE mentorship_sessions ALTER COLUMN status SET DEFAULT 'pending'");

  try {
    await pool.query(
      "ALTER TABLE mentorship_sessions DROP CONSTRAINT IF EXISTS mentorship_sessions_status_check"
    );
  } catch {}

  await pool.query(`
		ALTER TABLE mentorship_sessions
		ADD CONSTRAINT mentorship_sessions_status_check
		CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'scheduled', 'no_show'))
	`);

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentor_start ON mentorship_sessions (mentor_id, session_start_at)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_startup_start ON mentorship_sessions (startup_id, session_start_at)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_video_session_id ON mentorship_sessions (video_session_id)"
  );

  console.log("Applied mentorship scheduling migration");
}

up()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
