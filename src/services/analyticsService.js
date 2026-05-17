const pool = require("../config/db");
const aggregationService = require("./aggregationService");
const trendCalculator = require("../utils/trendCalculator");

async function getMentorAnalytics(userId) {
  const [relationships, sessions, earnings, ratings, activity] = await Promise.all([
    pool.query(
      "SELECT COUNT(*)::int AS total FROM mentorship_relationships WHERE mentor_id = (SELECT mentor_id FROM mentors WHERE user_id = $1)",
      [userId]
    ),
    pool.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='completed')::int AS completed FROM mentorship_sessions WHERE (host_id = $1 OR participant_id = $1)",
      [userId]
    ),
    pool.query(
      "SELECT COALESCE(SUM(amount),0)::numeric AS earnings FROM payments WHERE receiver_id = $1 AND status='completed'",
      [userId]
    ),
    pool.query(
      "SELECT AVG(rating)::numeric(4,2) AS avg_rating FROM ratings WHERE reviewed_user_id = $1 AND status='active'",
      [userId]
    ),
    pool.query("SELECT COUNT(*)::int AS activity_count FROM activity_logs WHERE user_id = $1", [
      userId,
    ]),
  ]);

  return {
    total_relationships: relationships.rows[0].total || 0,
    sessions_total: sessions.rows[0].total || 0,
    sessions_completed: sessions.rows[0].completed || 0,
    earnings: Number(earnings.rows[0].earnings || 0),
    average_rating: Number(ratings.rows[0].avg_rating || 0),
    activity_count: activity.rows[0].activity_count || 0,
  };
}

async function getStartupAnalytics(userId) {
  const [projects, milestones, funding, interactions] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS total FROM projects WHERE user_id = $1", [userId]),
    pool.query(
      "SELECT COUNT(*)::int AS milestones FROM project_milestones pm JOIN projects p ON p.project_id = pm.project_id WHERE p.user_id = $1",
      [userId]
    ),
    pool.query(
      "SELECT COALESCE(SUM(amount),0)::numeric AS funding FROM payments WHERE receiver_id = $1 AND status='completed'",
      [userId]
    ),
    pool.query(
      "SELECT COUNT(*)::int AS interactions FROM interactions WHERE user_id = $1 OR receiver_id = $1",
      [userId]
    ),
  ]);
  return {
    total_projects: projects.rows[0].total || 0,
    total_milestones: milestones.rows[0].milestones || 0,
    funding_received: Number(funding.rows[0].funding || 0),
    interactions: interactions.rows[0].interactions || 0,
  };
}

async function getInvestorAnalytics(userId) {
  const [investments, offers, portfolioValue] = await Promise.all([
    pool.query(
      "SELECT COUNT(*)::int AS active_investments FROM investments inv JOIN investors i ON i.investor_id = inv.investor_id JOIN users u ON u.user_id = i.user_id WHERE u.user_id = $1 AND inv.status='completed'",
      [userId]
    ),
    pool.query(
      "SELECT COUNT(*)::int AS offers FROM investment_offers WHERE investor_user_id = $1",
      [userId]
    ),
    pool.query(
      "SELECT COALESCE(SUM(amount),0)::numeric AS value FROM investments inv JOIN investors i ON i.investor_id = inv.investor_id JOIN users u ON u.user_id = i.user_id WHERE u.user_id = $1",
      [userId]
    ),
  ]);
  return {
    active_investments: investments.rows[0].active_investments || 0,
    offers: offers.rows[0].offers || 0,
    portfolio_value: Number(portfolioValue.rows[0].value || 0),
  };
}

async function getPlatformAnalytics() {
  // basic platform metrics
  const [users, mentors, startups, investors, relationships, sessions, payments] =
    await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL"),
      pool.query("SELECT COUNT(*)::int AS total FROM mentors"),
      pool.query("SELECT COUNT(*)::int AS total FROM startups"),
      pool.query("SELECT COUNT(*)::int AS total FROM investors"),
      pool.query("SELECT COUNT(*)::int AS total FROM mentorship_relationships"),
      pool.query("SELECT COUNT(*)::int AS total FROM mentorship_sessions WHERE status='completed'"),
      pool.query(
        "SELECT COALESCE(SUM(amount),0)::numeric AS volume FROM payments WHERE status='completed'"
      ),
    ]);
  return {
    total_users: users.rows[0].total || 0,
    mentors_count: mentors.rows[0].total || 0,
    startups_count: startups.rows[0].total || 0,
    investors_count: investors.rows[0].total || 0,
    relationships_created: relationships.rows[0].total || 0,
    sessions_completed: sessions.rows[0].total || 0,
    payment_volume: Number(payments.rows[0].volume || 0),
  };
}

module.exports = {
  getMentorAnalytics,
  getStartupAnalytics,
  getInvestorAnalytics,
  getPlatformAnalytics,
};
