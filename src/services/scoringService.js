const pool = require("../config/db");
const scoringHelper = require("../utils/scoringHelper");
const reputationService = require("./reputationService");

async function computeScoresForUser(userId) {
  // Gather factors
  const [ratingsRow, sessionsRow, relationshipsRow, paymentsRow, activityRow, profileRow] =
    await Promise.all([
      pool.query(
        "SELECT AVG(rating)::numeric(4,2) AS avg_rating, COUNT(*)::int AS total_reviews FROM ratings WHERE reviewed_user_id = $1 AND status='active'",
        [userId]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS completed_sessions FROM mentorship_sessions WHERE (host_id = $1 OR participant_id = $1) AND status='completed'",
        [userId]
      ),
      pool.query(
        "SELECT COUNT(*)::int AS completed_relationships FROM mentorship_relationships WHERE (mentor_id = $1 OR startup_id = $1) AND status='completed'",
        [userId]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount),0)::numeric AS payments_total FROM payments WHERE receiver_id = $1 AND status='completed'",
        [userId]
      ),
      pool.query("SELECT COUNT(*)::int AS activity_count FROM activity_logs WHERE user_id = $1", [
        userId,
      ]),
      pool.query(
        "SELECT is_approved, is_active, verification_status FROM users WHERE user_id = $1",
        [userId]
      ),
    ]);

  const avgRating = Number(ratingsRow.rows[0].avg_rating || 0);
  const totalReviews = Number(ratingsRow.rows[0].total_reviews || 0);
  const completedSessions = Number(sessionsRow.rows[0].completed_sessions || 0);
  const completedRelationships = Number(relationshipsRow.rows[0].completed_relationships || 0);
  const paymentsTotal = Number(paymentsRow.rows[0].payments_total || 0);
  const activityCount = Number(activityRow.rows[0].activity_count || 0);
  const profile = profileRow.rows[0] || {};

  const factors = {
    ratings: avgRating, // out of 5
    engagement: Math.min(100, activityCount),
    relationships: completedRelationships,
    sessions: completedSessions,
    payments: paymentsTotal,
    verification: profile.is_approved || profile.verification_status === "approved" ? 1 : 0,
    profile_active: profile.is_active ? 1 : 0,
  };

  const weights = {
    ratings: 30,
    engagement: 20,
    relationships: 20,
    sessions: 10,
    payments: 10,
    verification: 5,
    profile_active: 5,
  };

  // Normalize ratings to 0-100
  const normalized = { ...factors, ratings: (factors.ratings / 5) * 100 };
  const score = scoringHelper.weightedScore(weights, normalized);

  // Persist into intelligence_scores upsert
  await pool
    .query(
      `INSERT INTO intelligence_scores (user_id, score_type, score, metadata, calculated_at, updated_at)
     VALUES ($1,$2,$3,$4,NOW(),NOW())
     ON CONFLICT (user_id, score_type) DO UPDATE SET score = EXCLUDED.score, metadata = EXCLUDED.metadata, updated_at = NOW()`,
      [userId, "trust_score", score, { factors, weights }]
    )
    .catch(() => {});

  return { userId, score, factors };
}

module.exports = { computeScoresForUser };
