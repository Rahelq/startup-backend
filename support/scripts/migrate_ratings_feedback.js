const pool = require("../../src/config/db");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        relationship_id INTEGER,
        relationship_type TEXT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        reviewer_id INTEGER NOT NULL,
        reviewed_user_id INTEGER NOT NULL,
        rating SMALLINT NOT NULL,
        title TEXT,
        review TEXT,
        communication_rating SMALLINT,
        professionalism_rating SMALLINT,
        expertise_rating SMALLINT,
        value_rating SMALLINT,
        responsiveness_rating SMALLINT,
        status TEXT DEFAULT 'active',
        is_anonymous BOOLEAN DEFAULT false,
        moderated_by INTEGER,
        moderation_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query("ALTER TABLE ratings ADD COLUMN IF NOT EXISTS moderated_by INTEGER;");
    await client.query("ALTER TABLE ratings ADD COLUMN IF NOT EXISTS moderation_reason TEXT;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback_reports (
        id SERIAL PRIMARY KEY,
        rating_id INTEGER REFERENCES ratings(id) ON DELETE CASCADE,
        reported_by INTEGER NOT NULL,
        reason TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(
      "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;"
    );
    await client.query(
      "ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS reputation_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        average_rating NUMERIC(4,2) DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        total_relationships INTEGER DEFAULT 0,
        trust_score NUMERIC(5,2) DEFAULT 0,
        engagement_score NUMERIC(5,2) DEFAULT 0,
        completion_score NUMERIC(5,2) DEFAULT 0,
        response_score NUMERIC(5,2) DEFAULT 0,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ratings_entity ON ratings(entity_type, entity_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ratings_reviewer ON ratings(reviewer_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_reports_rating ON feedback_reports(rating_id);
    `);

    await client.query("COMMIT");
    console.log("Ratings & Feedback migration applied");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
