const pool = require("../../src/config/db");

async function apply() {
  console.log("Applying Phase 4 collaboration migration...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_resources (
      resource_id serial PRIMARY KEY,
      relationship_id integer,
      relationship_type varchar(50),
      uploaded_by integer NOT NULL,
      title varchar(255),
      description text,
      resource_type varchar(50),
      file_url text,
      public_id varchar(255),
      file_name varchar(255),
      file_size bigint,
      mime_type varchar(100),
      visibility varchar(50) DEFAULT 'participants',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_shared_resources_relationship ON shared_resources(relationship_type, relationship_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      activity_id serial PRIMARY KEY,
      user_id integer NOT NULL,
      activity_type varchar(100) NOT NULL,
      entity_type varchar(100),
      entity_id integer,
      metadata jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
  `);
  console.log("Phase 4 collaboration migration applied.");
}

if (require.main === module) {
  apply()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { apply };
