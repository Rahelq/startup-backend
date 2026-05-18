const pool = require("../config/db");
const ratingModel = require("../models/ratingModel");
const reputationModel = require("../models/reputationScoreModel");

async function getSessionTotals(userId) {
  const mentorship = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM mentorship_sessions ms
     LEFT JOIN mentors m ON m.mentor_id = ms.mentor_id
     LEFT JOIN startups s ON s.startup_id = ms.startup_id
     WHERE (m.user_id = $1 OR s.user_id = $1) AND ms.status = 'completed'`,
    [userId]
  );
  const meetings = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM video_sessions
     WHERE (host_id = $1 OR participant_id = $1) AND status = 'completed'`,
    [userId]
  );
  return Number(mentorship.rows[0]?.total || 0) + Number(meetings.rows[0]?.total || 0);
}

async function getRelationshipTotals(userId) {
  const mentorship = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM mentorship_relationships
     WHERE mentor_id = $1 OR startup_id = $1`,
    [userId]
  );
  const investment = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM investment_relationships
     WHERE investor_id = $1 OR startup_id = $1`,
    [userId]
  );
  return Number(mentorship.rows[0]?.total || 0) + Number(investment.rows[0]?.total || 0);
}

async function calculateReputationForUser(userId) {
  const aggregate = await pool.query(
    `SELECT
       COUNT(*)::int AS total_reviews,
       AVG(rating)::numeric(4,2) AS average_rating,
       AVG(COALESCE(communication_rating, rating))::numeric(4,2) AS communication_avg,
       AVG(COALESCE(professionalism_rating, rating))::numeric(4,2) AS professionalism_avg,
       AVG(COALESCE(responsiveness_rating, rating))::numeric(4,2) AS response_avg,
       AVG(COALESCE(expertise_rating, rating))::numeric(4,2) AS expertise_avg,
       AVG(COALESCE(value_rating, rating))::numeric(4,2) AS value_avg
     FROM ratings
     WHERE reviewed_user_id = $1 AND status = 'active'`,
    [userId]
  );

  const row = aggregate.rows[0] || {};
  const averageRating = Number(row.average_rating) || 0;
  const totalReviews = Number(row.total_reviews) || 0;
  const communication = Number(row.communication_avg) || 0;
  const professionalism = Number(row.professionalism_avg) || 0;
  const response = Number(row.response_avg) || 0;
  const expertise = Number(row.expertise_avg) || 0;
  const value = Number(row.value_avg) || 0;
  const totalSessions = await getSessionTotals(userId);
  const totalRelationships = await getRelationshipTotals(userId);

  const averageRatingScore = (averageRating / 5) * 100;
  const communicationScore = (communication / 5) * 100;
  const professionalismScore = (professionalism / 5) * 100;
  const responseScore = (response / 5) * 100;
  const expertiseScore = (expertise / 5) * 100;
  const valueScore = (value / 5) * 100;
  const sessionCompletionScore = Math.min(100, totalSessions * 20);
  const relationshipSuccessScore = Math.min(100, totalRelationships * 12.5);
  const activityConsistencyScore = Math.min(100, totalReviews * 5);
  const engagementScore = Math.min(100, totalReviews * 6);

  const trustScore =
    sessionCompletionScore * 0.2 +
    averageRatingScore * 0.35 +
    responseScore * 0.15 +
    relationshipSuccessScore * 0.2 +
    activityConsistencyScore * 0.1;

  const calculated = {
    average_rating: Number(averageRating.toFixed(2)),
    total_reviews: totalReviews,
    total_sessions: totalSessions,
    total_relationships: totalRelationships,
    trust_score: Number(trustScore.toFixed(2)),
    engagement_score: Number(
      Math.max(
        engagementScore,
        communicationScore,
        professionalismScore,
        expertiseScore,
        valueScore
      ).toFixed(2)
    ),
    completion_score: Number(sessionCompletionScore.toFixed(2)),
    response_score: Number(responseScore.toFixed(2)),
  };

  return reputationModel.upsertReputation(userId, calculated);
}

async function getReputationSummary(userId) {
  const [reputation, recentReviews, reviewTotals] = await Promise.all([
    reputationModel.findByUserId(userId),
    ratingModel.findRecentForUser(userId, { limit: 10 }),
    ratingModel.countByReviewedUser(userId),
  ]);
  return {
    reputation,
    recent_reviews: recentReviews,
    totals: reviewTotals,
  };
}

module.exports = {
  calculateReputationForUser,
  getReputationSummary,
  getSessionTotals,
  getRelationshipTotals,
};
