const pool = require("../config/db");

async function upsertReputation(userId, payload) {
  const res = await pool.query(
    `INSERT INTO reputation_scores (user_id, average_rating, total_reviews, total_sessions, total_relationships, trust_score, engagement_score, completion_score, response_score, calculated_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       average_rating = EXCLUDED.average_rating,
       total_reviews = EXCLUDED.total_reviews,
       total_sessions = EXCLUDED.total_sessions,
       total_relationships = EXCLUDED.total_relationships,
       trust_score = EXCLUDED.trust_score,
       engagement_score = EXCLUDED.engagement_score,
       completion_score = EXCLUDED.completion_score,
       response_score = EXCLUDED.response_score,
       calculated_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      payload.average_rating || 0,
      payload.total_reviews || 0,
      payload.total_sessions || 0,
      payload.total_relationships || 0,
      payload.trust_score || 0,
      payload.engagement_score || 0,
      payload.completion_score || 0,
      payload.response_score || 0,
    ]
  );
  return res.rows[0];
}

async function findByUserId(userId) {
  const res = await pool.query("SELECT * FROM reputation_scores WHERE user_id = $1", [userId]);
  return res.rows[0];
}

module.exports = { upsertReputation, findByUserId };
