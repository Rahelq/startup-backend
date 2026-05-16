-- Migration: create reports/flags table
-- Run manually: psql -f create_reports_table.sql
CREATE TABLE IF NOT EXISTS reports (
  report_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  target_id INTEGER,
  target_type VARCHAR(50),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, actioned
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
