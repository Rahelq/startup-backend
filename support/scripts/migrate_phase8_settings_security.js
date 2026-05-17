const pool = require("../../src/config/db");

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // user_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id uuid PRIMARY KEY,
        timezone varchar(64),
        language varchar(16),
        preferences jsonb DEFAULT '{}'::jsonb,
        updated_at timestamptz DEFAULT NOW()
      )
    `);

    // privacy_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        user_id uuid PRIMARY KEY,
        profile_visibility varchar(32) DEFAULT 'private',
        show_email boolean DEFAULT false,
        show_phone boolean DEFAULT false,
        data_sharing jsonb DEFAULT '{}'::jsonb,
        updated_at timestamptz DEFAULT NOW()
      )
    `);

    // notification_preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id uuid PRIMARY KEY,
        channels jsonb DEFAULT '{}'::jsonb,
        preferences jsonb DEFAULT '{}'::jsonb,
        updated_at timestamptz DEFAULT NOW()
      )
    `);

    // user_devices
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id serial PRIMARY KEY,
        user_id uuid NOT NULL,
        device_id varchar(255) NOT NULL,
        device_info jsonb,
        trusted boolean DEFAULT false,
        created_at timestamptz DEFAULT NOW(),
        last_seen_at timestamptz DEFAULT NOW()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id)");

    // user_sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id serial PRIMARY KEY,
        user_id uuid NOT NULL,
        session_token varchar(512),
        ip_address varchar(64),
        user_agent text,
        last_activity_at timestamptz DEFAULT NOW(),
        is_revoked boolean DEFAULT false,
        created_at timestamptz DEFAULT NOW()
      )
    `);
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)"
    );

    // security_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id serial PRIMARY KEY,
        user_id uuid,
        event_type varchar(128),
        severity varchar(16),
        ip_address varchar(64),
        meta jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT NOW()
      )
    `);

    // two_factor_auth
    await client.query(`
      CREATE TABLE IF NOT EXISTS two_factor_auth (
        user_id uuid PRIMARY KEY,
        secret text,
        backup_codes text[] DEFAULT '{}',
        is_enabled boolean DEFAULT false,
        enabled_at timestamptz,
        updated_at timestamptz DEFAULT NOW()
      )
    `);

    // login_attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id serial PRIMARY KEY,
        user_id uuid,
        email varchar(255),
        ip_address varchar(64),
        device_info jsonb,
        success boolean DEFAULT false,
        failure_reason text,
        created_at timestamptz DEFAULT NOW()
      )
    `);

    // account_recovery_tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_recovery_tokens (
        id serial PRIMARY KEY,
        user_id uuid NOT NULL,
        token varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        consumed boolean DEFAULT false,
        created_at timestamptz DEFAULT NOW()
      )
    `);

    // blocked_users
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id serial PRIMARY KEY,
        blocker_id uuid NOT NULL,
        blocked_id uuid NOT NULL,
        reason text,
        created_at timestamptz DEFAULT NOW()
      )
    `);

    await client.query("COMMIT");
    console.log("Phase 8 settings & security migration applied");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed", err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
