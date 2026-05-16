const pool = require("../config/db");

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_sessions (
      id SERIAL PRIMARY KEY,
      host_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      participant_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE SET NULL,
      meeting_link TEXT,
      meeting_id TEXT,
      provider TEXT DEFAULT 'zoom',
      scheduled_at TIMESTAMPTZ NOT NULL,
      duration INTEGER NOT NULL DEFAULT 60,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const addColumns = [
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE SET NULL",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS meeting_link TEXT",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS meeting_id TEXT",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'zoom'",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'",
    "ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
  ];

  for (const statement of addColumns) {
    await pool.query(statement);
  }

  try {
    await pool.query(
      "ALTER TABLE video_sessions DROP CONSTRAINT IF EXISTS video_sessions_status_check"
    );
  } catch {}
  await pool.query(`
    ALTER TABLE video_sessions
    ADD CONSTRAINT video_sessions_status_check
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
  `);

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_video_sessions_meeting_id ON video_sessions (meeting_id)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_video_sessions_conversation_id ON video_sessions (conversation_id)"
  );

  console.log("Applied video_sessions migration");
}

up()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
