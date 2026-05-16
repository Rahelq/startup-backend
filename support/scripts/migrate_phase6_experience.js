const pool = require("../../src/config/db");

async function migratePhase6Experience() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
			ON notifications (user_id, is_read, created_at DESC);
		`);
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_messages_receiver_read_created
			ON messages (receiver_user_id, is_read, created_at DESC);
		`);
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_request_date
			ON mentorship_sessions (mentorship_request_id, session_date);
		`);
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
			ON activity_logs (user_id, created_at DESC);
		`);
    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_video_sessions_created_by_scheduled
      ON video_sessions (conversation_id, scheduled_at DESC);
		`);
    await client.query("COMMIT");
    console.log("Phase 6 experience indexes applied");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

migratePhase6Experience()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
