-- Add indexes for frequently queried columns to improve performance
CREATE INDEX IF NOT EXISTS idx_messages_receiver_is_read ON messages (receiver_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_from_user ON payments (from_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_to_user ON payments (to_user_id);
-- payment reference indexes are created in the payments migration where those
-- columns are added (migrate_phase5_transactions.js) to avoid referencing
-- columns that don't yet exist during initial schema apply.
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentor ON mentorship_requests (mentor_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens (user_id, revoked);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Add more as needed after profiling
