const pool = require("../config/db");

async function runMigrations() {
	console.log("Starting consolidated migrations...");

	try {
		await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

      UPDATE users
      SET status = CASE
        WHEN is_active = true THEN 'active'
        WHEN is_approved = false THEN 'pending'
        ELSE 'inactive'
      END
      WHERE status = 'pending';

      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS profile_picture TEXT,
      ADD COLUMN IF NOT EXISTS investment_focus JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS funding_range_min DECIMAL(14,2) CHECK (funding_range_min >= 0),
      ADD COLUMN IF NOT EXISTS funding_range_max DECIMAL(14,2) CHECK (funding_range_max >= 0),
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'approved', 'rejected'));

      CREATE TABLE IF NOT EXISTS reports (
        report_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        target_id INTEGER,
        target_type VARCHAR(50),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

      CREATE TABLE IF NOT EXISTS investor_documents (
        investor_document_id SERIAL PRIMARY KEY,
        investor_id INTEGER NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('portfolio', 'cv', 'agreement', 'other')),
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_type VARCHAR(100),
        file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_investor_documents_investor ON investor_documents (investor_id);
      CREATE INDEX IF NOT EXISTS idx_investor_documents_type ON investor_documents (document_type);
      CREATE INDEX IF NOT EXISTS idx_investors_verification_status ON investors (verification_status);

      CREATE TABLE IF NOT EXISTS project_documents (
        project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        document_id INTEGER NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, document_id)
      );
      CREATE INDEX IF NOT EXISTS idx_project_documents_document ON project_documents (document_id);

      CREATE TABLE IF NOT EXISTS project_milestones (
        milestone_id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        milestone_title VARCHAR(255) NOT NULL,
        description TEXT,
        target_date DATE,
        completed_at TIMESTAMPTZ,
        deliverables TEXT,
        success_criteria TEXT,
        estimated_cost DECIMAL(14,2) CHECK (estimated_cost >= 0),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones (project_id);
      CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones (status);

      ALTER TABLE project_milestones
      ADD COLUMN IF NOT EXISTS progress_notes TEXT,
      ADD COLUMN IF NOT EXISTS completion_date DATE;

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
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT no_self_interaction CHECK (sender_id <> receiver_id)
      );
      CREATE INDEX IF NOT EXISTS idx_interaction_sender_id ON interaction_requests(sender_id);
      CREATE INDEX IF NOT EXISTS idx_interaction_receiver_id ON interaction_requests(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_interaction_status ON interaction_requests(status);
      CREATE INDEX IF NOT EXISTS idx_interaction_category ON interaction_requests(category);

      CREATE TABLE IF NOT EXISTS mentorship_relationships (
        mentorship_id SERIAL PRIMARY KEY,
        mentor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        startup_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        interaction_request_id INTEGER REFERENCES interaction_requests(interaction_id) ON DELETE SET NULL,
        mentorship_request_id INTEGER REFERENCES mentorship_requests(mentorship_request_id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_mentorship UNIQUE(mentor_id, startup_id)
      );
      ALTER TABLE mentorship_relationships
      ADD COLUMN IF NOT EXISTS mentorship_request_id INTEGER REFERENCES mentorship_requests(mentorship_request_id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_mentorship_mentor_id ON mentorship_relationships(mentor_id);
      CREATE INDEX IF NOT EXISTS idx_mentorship_startup_id ON mentorship_relationships(startup_id);

      CREATE TABLE IF NOT EXISTS mentorship_pricing (
        mentorship_pricing_id SERIAL PRIMARY KEY,
        mentor_id INTEGER NOT NULL UNIQUE REFERENCES mentors(mentor_id) ON DELETE CASCADE,
        hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 0),
        session_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (session_duration_minutes >= 15),
        availability_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS investment_relationships (
        investment_id SERIAL PRIMARY KEY,
        investor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        startup_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        interaction_request_id INTEGER REFERENCES interaction_requests(interaction_id) ON DELETE SET NULL,
        funding_amount DECIMAL(15, 2),
        equity_percentage DECIMAL(5, 2),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_investment UNIQUE(investor_id, startup_id)
      );
      CREATE INDEX IF NOT EXISTS idx_investment_investor_id ON investment_relationships(investor_id);
      CREATE INDEX IF NOT EXISTS idx_investment_startup_id ON investment_relationships(startup_id);

      ALTER TABLE investment_relationships
      DROP CONSTRAINT IF EXISTS investment_relationships_status_check;
      ALTER TABLE investment_relationships
      ADD CONSTRAINT investment_relationships_status_check
      CHECK (status IN ('pending', 'active', 'accepted', 'rejected', 'countered', 'completed', 'cancelled'));

      CREATE TABLE IF NOT EXISTS interaction_audit (
        audit_id SERIAL PRIMARY KEY,
        interaction_id INTEGER REFERENCES interaction_requests(interaction_id) ON DELETE CASCADE,
        action VARCHAR(50),
        actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

		console.log("All migrations completed successfully.");
		process.exit(0);
	} catch (err) {
		console.error("Migration failed:", err.message);
		process.exit(1);
	}
}

runMigrations();
