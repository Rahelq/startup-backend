-- Add indexes for frequently queried columns to improve performance
CREATE INDEX IF NOT EXISTS idx_messages_receiver_is_read ON messages (receiver_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments (payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_receiver ON payments (receiver_id);
CREATE INDEX IF NOT EXISTS idx_payments_txref ON payments (transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payments_chapa_txref ON payments (chapa_tx_ref);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentor ON mentorship_requests (mentor_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens (user_id, revoked);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Add more as needed after profiling
