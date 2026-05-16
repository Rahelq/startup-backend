-- Migration: add status column to users
-- Run manually: psql -f migrate_add_user_status.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Backfill: if is_active is false, set status = 'suspended'
UPDATE users SET status = CASE WHEN is_active = false THEN 'suspended' ELSE 'active' END WHERE status IS NULL OR status = '';

-- Note: keep is_active for compatibility; new code should prefer `status`.
