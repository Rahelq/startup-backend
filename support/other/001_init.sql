CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'Admin', 'Startup', 'Investor', 'Mentor')),
    phone_number VARCHAR(20) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    privilege_level SMALLINT NOT NULL DEFAULT 1 CHECK (privilege_level BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS startups (
    startup_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    startup_name VARCHAR(255) NOT NULL,
    industry VARCHAR(120),
    description TEXT,
    business_stage VARCHAR(50),
    founded_year INTEGER CHECK (founded_year BETWEEN 1900 AND 2100),
    team_size INTEGER CHECK (team_size >= 0),
    location VARCHAR(150),
    website VARCHAR(255),
    funding_needed DECIMAL(14,2) CHECK (funding_needed >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investors (
    investor_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    investor_type VARCHAR(50) NOT NULL,
    organization_name VARCHAR(255),
    investment_budget DECIMAL(14,2) CHECK (investment_budget >= 0),
    preferred_industry VARCHAR(120),
    investment_stage VARCHAR(50),
    country VARCHAR(100),
    portfolio_size INTEGER CHECK (portfolio_size >= 0),
    bio TEXT,
    profile_picture TEXT,
    investment_focus JSONB DEFAULT '[]'::jsonb,
    funding_range_min DECIMAL(14,2) CHECK (funding_range_min >= 0),
    funding_range_max DECIMAL(14,2) CHECK (funding_range_max >= 0),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS mentors (
    mentor_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    headline VARCHAR(255),
    expertise TEXT,
    skills JSONB,
    industries JSONB,
    years_experience INTEGER CHECK (years_experience >= 0),
    hourly_rate DECIMAL(10,2) CHECK (hourly_rate >= 0),
    country VARCHAR(100),
    bio TEXT,
    profile_picture TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    availability JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
    project_title VARCHAR(255) NOT NULL,
    description TEXT,
    funding_goal DECIMAL(14,2) NOT NULL CHECK (funding_goal >= 0),
    amount_raised DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (amount_raised >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'funded', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS documents (
    document_id SERIAL PRIMARY KEY,
    startup_id INTEGER REFERENCES startups(startup_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_type VARCHAR(100),
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_documents (
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, document_id)
);

CREATE TABLE IF NOT EXISTS project_milestones (
    milestone_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    milestone_title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    deliverables TEXT,
    success_criteria TEXT,
    progress_notes TEXT,
    completion_date DATE,
    estimated_cost DECIMAL(14,2) CHECK (estimated_cost >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentor_documents (
    mentor_document_id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(mentor_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('cv','certification','other')),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_type VARCHAR(100),
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investment_requests (
    investment_request_id SERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
    investor_id INTEGER NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    requested_amount DECIMAL(14,2) NOT NULL CHECK (requested_amount > 0),
    proposal_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investments (
    investment_id SERIAL PRIMARY KEY,
    investment_request_id INTEGER NOT NULL UNIQUE REFERENCES investment_requests(investment_request_id) ON DELETE CASCADE,
    amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
    equity_percentage DECIMAL(5,2) CHECK (equity_percentage >= 0 AND equity_percentage <= 100),
    agreement_file_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investor_feedback (
    feedback_id SERIAL PRIMARY KEY,
    investment_request_id INTEGER NOT NULL REFERENCES investment_requests(investment_request_id) ON DELETE CASCADE,
    startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
    investor_id INTEGER NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (investment_request_id, investor_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    conversation_type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'mentor_chat', 'investment_chat')),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (user1_id <> user2_id),
    UNIQUE (user1_id, user2_id, conversation_type)
);

CREATE TABLE IF NOT EXISTS video_sessions (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE SET NULL,
    meeting_link TEXT,
    meeting_id TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    scheduled_at TIMESTAMPTZ,
    duration INTEGER NOT NULL DEFAULT 60 CHECK (duration > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','started','ended','cancelled','failed')),
    created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentorship_requests (
    mentorship_request_id SERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES mentors(mentor_id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentorship_sessions (
    mentorship_session_id SERIAL PRIMARY KEY,
    mentorship_request_id INTEGER NOT NULL REFERENCES mentorship_requests(mentorship_request_id) ON DELETE CASCADE,
    mentor_id INTEGER REFERENCES mentors(mentor_id) ON DELETE CASCADE,
    startup_id INTEGER REFERENCES startups(startup_id) ON DELETE CASCADE,
    session_date DATE,
    start_time TIME,
    end_time TIME,
    scheduled_at TIMESTAMPTZ NOT NULL,
    session_start_at TIMESTAMPTZ,
    session_end_at TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    meeting_link TEXT,
    conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE SET NULL,
    video_session_id INTEGER REFERENCES video_sessions(id) ON DELETE SET NULL,
    booked_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'scheduled', 'no_show')),
    confirmed_at TIMESTAMPTZ,
    reminder_24h_sent_at TIMESTAMPTZ,
    reminder_1h_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    payment_provider VARCHAR(50),
    gateway_tx_ref VARCHAR(255),
    checkout_url TEXT,
    gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (from_user_id <> to_user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_type VARCHAR(30) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    subject VARCHAR(255),
    message TEXT,
    attachment_name VARCHAR(255),
    attachment_path TEXT,
    attachment_mime VARCHAR(150),
    attachment_size BIGINT,
    edited_at TIMESTAMPTZ,
    edited_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
    delivered_at TIMESTAMPTZ,
    seen_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (sender_user_id <> receiver_user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES mentors(mentor_id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_log_id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address INET,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    report_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    target_id INTEGER,
    target_type VARCHAR(50),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'accepted', 'rejected', 'countered', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_investment UNIQUE(investor_id, startup_id)
);

CREATE TABLE IF NOT EXISTS interaction_audit (
    audit_id SERIAL PRIMARY KEY,
    interaction_id INTEGER REFERENCES interaction_requests(interaction_id) ON DELETE CASCADE,
    action VARCHAR(50),
    actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Refresh / session tokens for logout / rotation
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
