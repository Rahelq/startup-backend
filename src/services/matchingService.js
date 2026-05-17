const pool = require("../config/db");
const recommendationHelper = require("../utils/recommendationHelper");

async function matchMentorStartup(mentorUserId, startupUserId) {
  // Compute compatibility using simple heuristics
  // Fetch mentor rating and engagement
  const mentorQ = await pool.query(
    "SELECT u.user_id, coalesce(ar.avg_rating,0) AS avg_rating FROM users u LEFT JOIN (SELECT reviewed_user_id, AVG(rating) AS avg_rating FROM ratings WHERE status='active' GROUP BY reviewed_user_id) ar ON ar.reviewed_user_id = u.user_id WHERE u.user_id = $1",
    [mentorUserId]
  );
  const mentor = mentorQ.rows[0] || { user_id: mentorUserId, avg_rating: 0 };
  const candidate = {
    industries: [],
    rating: Number(mentor.avg_rating || 0),
    engagement: 60,
    availabilityScore: 0.6,
  };
  const score = recommendationHelper.compatibilityScore(candidate, {});

  const res = await pool.query(
    "INSERT INTO matches (user_id, matched_user_id, match_type, compatibility_score, match_reason, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [startupUserId, mentorUserId, "mentorship", score, "heuristic_match", { candidate }]
  );
  return res.rows[0];
}

module.exports = { matchMentorStartup };
