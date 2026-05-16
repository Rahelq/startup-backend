-- Migration: Create Interaction Request System
-- Date: May 6, 2026
-- Purpose: Unified system for mentorship & investment interactions

-- ============================================
-- 1. INTERACTION REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS interaction_requests (
  interaction_id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('request', 'invite')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('mentorship', 'investment')),
  message TEXT,
  funding_amount DECIMAL(15, 2),
  equity_offer DECIMAL(5, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT no_self_interaction CHECK (sender_id != receiver_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_interaction_sender_id ON interaction_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_interaction_receiver_id ON interaction_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_interaction_status ON interaction_requests(status);
CREATE INDEX IF NOT EXISTS idx_interaction_category ON interaction_requests(category);
CREATE INDEX IF NOT EXISTS idx_interaction_created_at ON interaction_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_sender_receiver ON interaction_requests(sender_id, receiver_id);

-- ============================================
-- 2. MENTORSHIP RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mentorship_relationships (
  mentorship_id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  startup_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  interaction_request_id INTEGER NOT NULL REFERENCES interaction_requests(interaction_id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_mentorship UNIQUE(mentor_id, startup_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentorship_mentor_id ON mentorship_relationships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_startup_id ON mentorship_relationships(startup_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_status ON mentorship_relationships(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_interaction_id ON mentorship_relationships(interaction_request_id);

-- ============================================
-- 3. INVESTMENT RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investment_relationships (
  investment_id SERIAL PRIMARY KEY,
  investor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  startup_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  interaction_request_id INTEGER NOT NULL REFERENCES interaction_requests(interaction_id) ON DELETE SET NULL,
  funding_amount DECIMAL(15, 2),
  equity_percentage DECIMAL(5, 2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_investment UNIQUE(investor_id, startup_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_investor_id ON investment_relationships(investor_id);
CREATE INDEX IF NOT EXISTS idx_investment_startup_id ON investment_relationships(startup_id);
CREATE INDEX IF NOT EXISTS idx_investment_status ON investment_relationships(status);
CREATE INDEX IF NOT EXISTS idx_investment_interaction_id ON investment_relationships(interaction_request_id);

-- ============================================
-- 4. AUDIT TABLE (for compliance & tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS interaction_audit (
  audit_id SERIAL PRIMARY KEY,
  interaction_id INTEGER NOT NULL REFERENCES interaction_requests(interaction_id) ON DELETE CASCADE,
  action VARCHAR(50),
  actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interaction_audit_interaction_id ON interaction_audit(interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_audit_actor_id ON interaction_audit(actor_user_id);
