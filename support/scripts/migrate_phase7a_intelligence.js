const pool = require("../../src/config/db");

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_snapshots (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        metric_type VARCHAR(50) NOT NULL,
        metric_value NUMERIC,
        metadata JSONB,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_entity ON analytics_snapshots(entity_type, entity_id, snapshot_date);

      CREATE TABLE IF NOT EXISTS intelligence_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        score_type VARCHAR(50) NOT NULL,
        score NUMERIC NOT NULL,
        metadata JSONB,
        calculated_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_intelligence_user ON intelligence_scores(user_id, score_type);

      CREATE TABLE IF NOT EXISTS recommendation_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        target_id INTEGER NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        score NUMERIC NOT NULL,
        reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reco_user ON recommendation_scores(user_id, target_type);

      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        matched_user_id INTEGER NOT NULL,
        match_type VARCHAR(50) NOT NULL,
        compatibility_score NUMERIC NOT NULL,
        match_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id, match_type);
    `);

    console.log("Phase7A intelligence migration applied");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  }
}

run();
