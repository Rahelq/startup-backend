const pool = require("../config/db");
const startupModel = require("../models/startupModel");
const mentorModel = require("../models/mentorModel");
const investorModel = require("../models/investorModel");
const activityFeedService = require("./activityFeedService");
const notificationService = require("./notificationService");
const recommendationService = require("./recommendationService");

function parseLimit(value, fallback = 10, max = 100) {
  return Math.min(Math.max(Number(value) || fallback, 1), max);
}

async function getUnreadMessageCount(userId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS unread FROM messages WHERE receiver_user_id = $1 AND is_read = false",
    [userId]
  );
  return result.rows[0]?.unread || 0;
}

async function getRecentMessages(userId, limit = 10) {
  const result = await pool.query(
    `SELECT m.message_id, m.conversation_id, m.sender_user_id, m.receiver_user_id,
			m.message_type, m.subject, m.body, m.is_read, m.status, m.created_at,
			u.first_name AS sender_first_name, u.last_name AS sender_last_name,
			ou.first_name AS receiver_first_name, ou.last_name AS receiver_last_name
		 FROM messages m
		 JOIN users u ON u.user_id = m.sender_user_id
		 JOIN users ou ON ou.user_id = m.receiver_user_id
		 WHERE m.sender_user_id = $1 OR m.receiver_user_id = $1
		 ORDER BY m.created_at DESC
		 LIMIT $2`,
    [userId, parseLimit(limit)]
  );
  return result.rows;
}

async function getUpcomingMeetings(userId, limit = 10) {
  const result = await pool.query(
    `SELECT vs.id AS video_session_id, vs.conversation_id, vs.meeting_link, vs.meeting_id,
			vs.provider, vs.scheduled_at, vs.duration, vs.status, vs.created_at,
			c.user1_id, c.user2_id
		 FROM video_sessions vs
		 LEFT JOIN conversations c ON c.conversation_id = vs.conversation_id
		 WHERE vs.scheduled_at >= NOW()
       AND (c.user1_id = $1 OR c.user2_id = $1)
		 ORDER BY vs.scheduled_at ASC
		 LIMIT $2`,
    [userId, parseLimit(limit)]
  );
  return result.rows;
}

async function getUpcomingSessions(userId, role, limit = 10) {
  const normalizedRole = String(role || "").toLowerCase();
  let result;
  if (normalizedRole === "mentor") {
    result = await pool.query(
      `SELECT ms.*, mr.startup_id, mr.mentor_id, mr.status AS relationship_status,
				su.first_name AS startup_first_name, su.last_name AS startup_last_name
			 FROM mentorship_sessions ms
			 JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
			 JOIN startups s ON s.startup_id = mr.startup_id
			 JOIN users su ON su.user_id = s.user_id
			 JOIN mentors m ON m.mentor_id = mr.mentor_id
			 JOIN users mu ON mu.user_id = m.user_id
			 WHERE mu.user_id = $1 AND COALESCE(ms.session_start_at, ms.scheduled_at) >= NOW()
			 ORDER BY COALESCE(ms.session_start_at, ms.scheduled_at) ASC
			 LIMIT $2`,
      [userId, parseLimit(limit)]
    );
  } else {
    result = await pool.query(
      `SELECT ms.*, mr.startup_id, mr.mentor_id, mr.status AS relationship_status,
				su.first_name AS startup_first_name, su.last_name AS startup_last_name
			 FROM mentorship_sessions ms
			 JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
			 JOIN startups s ON s.startup_id = mr.startup_id
			 JOIN users su ON su.user_id = s.user_id
			 JOIN mentors m ON m.mentor_id = mr.mentor_id
			 JOIN users mu ON mu.user_id = m.user_id
			 WHERE su.user_id = $1 AND COALESCE(ms.session_start_at, ms.scheduled_at) >= NOW()
			 ORDER BY COALESCE(ms.session_start_at, ms.scheduled_at) ASC
			 LIMIT $2`,
      [userId, parseLimit(limit)]
    );
  }
  return result.rows;
}

async function getRelationshipStatistics(userId, role) {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "mentor") {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE mr.status = 'active')::int AS active_mentees,
        COUNT(*) FILTER (WHERE mr.status = 'completed')::int AS completed_mentees,
				COUNT(*)::int AS total_relationships
			 FROM mentorship_relationships mr
			 JOIN mentors m ON m.mentor_id = mr.mentor_id
			 JOIN users u ON u.user_id = m.user_id
			 WHERE u.user_id = $1`,
      [userId]
    );
    return result.rows[0] || { active_mentees: 0, completed_mentees: 0, total_relationships: 0 };
  }

  if (normalizedRole === "investor") {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE ir.status IN ('active','accepted'))::int AS active_startups,
        COUNT(*) FILTER (WHERE ir.status IN ('negotiating','under_review'))::int AS active_negotiations,
				COUNT(*)::int AS total_relationships
			 FROM investment_relationships ir
			 JOIN investors i ON i.investor_id = ir.investor_id
			 JOIN users u ON u.user_id = i.user_id
			 WHERE u.user_id = $1`,
      [userId]
    );
    return result.rows[0] || { active_startups: 0, active_negotiations: 0, total_relationships: 0 };
  }

  const startup = await startupModel.findByUserId(userId);
  if (!startup) return { active_mentors: 0, active_investors: 0, total_relationships: 0 };
  const [mentors, investors] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS c FROM mentorship_relationships WHERE startup_id = $1", [
      startup.startup_id,
    ]),
    pool.query("SELECT COUNT(*)::int AS c FROM investment_relationships WHERE startup_id = $1", [
      startup.startup_id,
    ]),
  ]);
  return {
    active_mentors: mentors.rows[0]?.c || 0,
    active_investors: investors.rows[0]?.c || 0,
    total_relationships: (mentors.rows[0]?.c || 0) + (investors.rows[0]?.c || 0),
  };
}

async function getProjectProgress(startupId) {
  const [projects, milestones] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount_raised),0)::numeric AS amount_raised
			 FROM projects WHERE startup_id = $1 GROUP BY status`,
      [startupId]
    ),
    pool.query(
      `SELECT pm.status, COUNT(*)::int AS count
			 FROM project_milestones pm
			 JOIN projects p ON p.project_id = pm.project_id
			 WHERE p.startup_id = $1
			 GROUP BY pm.status`,
      [startupId]
    ),
  ]);
  return { projects: projects.rows, milestones: milestones.rows };
}

async function getFundingProgress(startupUserId) {
  const [requests, payments, investments] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(requested_amount),0)::numeric AS requested_amount
			 FROM investment_requests
			 JOIN startups s ON s.startup_id = investment_requests.startup_id
			 WHERE s.user_id = $1
			 GROUP BY status`,
      [startupUserId]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS amount
			 FROM payments
			 WHERE receiver_id = $1
			 GROUP BY status`,
      [startupUserId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
			 FROM investments inv
			 JOIN investment_requests ir ON ir.investment_request_id = inv.investment_request_id
			 JOIN startups s ON s.startup_id = ir.startup_id
			 WHERE s.user_id = $1`,
      [startupUserId]
    ),
  ]);
  return {
    requests: requests.rows,
    payments: payments.rows,
    completed_investments: investments.rows[0]?.count || 0,
  };
}

async function getDashboardSummary(userId, role) {
  const unreadMessages = await getUnreadMessageCount(userId);
  const notifications = await notificationService.getNotificationSummary(userId, { limit: 10 });
  const recentActivity = await activityFeedService.getFeed({
    userId,
    role,
    limit: 10,
    page: 1,
    scope: "related",
  });
  return { unread_messages: unreadMessages, notifications, recent_activity: recentActivity.items };
}

async function getStartupDashboard(userId, query = {}) {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) {
    const err = new Error("Startup profile not found");
    err.status = 404;
    throw err;
  }

  const [
    base,
    sessions,
    meetings,
    messages,
    progress,
    funding,
    recommendations,
    relationships,
    sharedResources,
  ] = await Promise.all([
    getDashboardSummary(userId, "startup"),
    getUpcomingSessions(userId, "startup", query.sessionLimit || 10),
    getUpcomingMeetings(userId, query.meetingLimit || 10),
    getRecentMessages(userId, query.messageLimit || 10),
    getProjectProgress(startup.startup_id),
    getFundingProgress(userId),
    recommendationService.getStartupRecommendations(userId, {
      limit: query.recommendationLimit || 10,
    }),
    getRelationshipStatistics(userId, "startup"),
    pool.query(
      `SELECT sr.*, mr.mentorship_id, ir.investment_id
			 FROM shared_resources sr
			 LEFT JOIN mentorship_relationships mr
				 ON sr.relationship_type = 'mentorship' AND sr.relationship_id = mr.mentorship_id
			 LEFT JOIN investment_relationships ir
				 ON sr.relationship_type = 'investment' AND sr.relationship_id = ir.investment_id
			 WHERE (mr.startup_id = $1 OR ir.startup_id = $1 OR sr.uploaded_by = $2)
			 ORDER BY sr.created_at DESC
			 LIMIT 10`,
      [startup.startup_id, userId]
    ),
  ]);

  return {
    dashboard_summary: base,
    recent_activity: base.recent_activity,
    upcoming_sessions: sessions,
    upcoming_meetings: meetings,
    recent_messages: messages,
    notifications: base.notifications,
    project_progress: progress,
    funding_progress: funding,
    recommended_mentors: recommendations.mentors,
    recommended_investors: recommendations.investors,
    relationship_statistics: relationships,
    shared_resources: sharedResources.rows,
  };
}

async function getMentorDashboard(userId, query = {}) {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    const err = new Error("Mentor profile not found");
    err.status = 404;
    throw err;
  }

  const [base, sessions, messages, recommendations, relationships, ratings, earnings] =
    await Promise.all([
      getDashboardSummary(userId, "mentor"),
      getUpcomingSessions(userId, "mentor", query.sessionLimit || 10),
      getRecentMessages(userId, query.messageLimit || 10),
      recommendationService.getMentorRecommendations(userId, {
        limit: query.recommendationLimit || 10,
      }),
      getRelationshipStatistics(userId, "mentor"),
      pool.query(
        `SELECT COALESCE(AVG(rating), 0)::numeric AS average_rating
			 FROM reviews WHERE mentor_id = $1`,
        [mentor.mentor_id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total_earnings
			 FROM payments WHERE receiver_id = $1 AND status = 'completed'`,
        [userId]
      ),
    ]);

  return {
    dashboard_summary: base,
    recent_activity: base.recent_activity,
    upcoming_sessions: sessions,
    recent_messages: messages,
    notifications: base.notifications,
    relationship_statistics: relationships,
    mentee_progress: relationships,
    average_rating: ratings.rows[0]?.average_rating || 0,
    total_earnings: earnings.rows[0]?.total_earnings || 0,
    recommended_startups: recommendations.startups,
    recommended_projects: recommendations.projects,
  };
}

async function getInvestorDashboard(userId, query = {}) {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) {
    const err = new Error("Investor profile not found");
    err.status = 404;
    throw err;
  }

  const [base, meetings, messages, recommendations, relationships, portfolio, fundingRequests] =
    await Promise.all([
      getDashboardSummary(userId, "investor"),
      getUpcomingMeetings(userId, query.meetingLimit || 10),
      getRecentMessages(userId, query.messageLimit || 10),
      recommendationService.getInvestorRecommendations(userId, {
        limit: query.recommendationLimit || 10,
      }),
      getRelationshipStatistics(userId, "investor"),
      pool.query(
        `SELECT i.*, ir.startup_id, ir.status AS request_status
			 FROM investments i
			 JOIN investment_requests ir ON ir.investment_request_id = i.investment_request_id
			 JOIN investors inv ON inv.investor_id = ir.investor_id
			 JOIN users u ON u.user_id = inv.user_id
			 WHERE u.user_id = $1
			 ORDER BY i.created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT ir.*
			 FROM investment_requests ir
			 JOIN investors inv ON inv.investor_id = ir.investor_id
			 JOIN users u ON u.user_id = inv.user_id
			 WHERE u.user_id = $1
			 ORDER BY ir.created_at DESC
			 LIMIT 10`,
        [userId]
      ),
    ]);

  return {
    dashboard_summary: base,
    recent_activity: base.recent_activity,
    upcoming_meetings: meetings,
    recent_messages: messages,
    notifications: base.notifications,
    relationship_statistics: relationships,
    portfolio_activity: portfolio.rows,
    funding_requests_pending: fundingRequests.rows,
    recommended_startups: recommendations.startups,
    recommended_projects: recommendations.projects,
  };
}

async function getAdminDashboard(userId, query = {}) {
  const [
    totalUsers,
    totalStartups,
    totalMentors,
    totalInvestors,
    payments,
    activeSessions,
    activeMeetings,
    activeRelationships,
    recentActivity,
    systemHealth,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL"),
    pool.query("SELECT COUNT(*)::int AS count FROM startups"),
    pool.query("SELECT COUNT(*)::int AS count FROM mentors"),
    pool.query("SELECT COUNT(*)::int AS count FROM investors"),
    pool.query(
      "SELECT COALESCE(SUM(amount), 0)::numeric AS revenue FROM payments WHERE status = 'completed'"
    ),
    pool.query(
      "SELECT COUNT(*)::int AS count FROM mentorship_sessions WHERE status IN ('scheduled','confirmed','pending')"
    ),
    pool.query(
      "SELECT COUNT(*)::int AS count FROM video_sessions WHERE status IN ('scheduled','started')"
    ),
    pool.query(
      `SELECT
				(
					SELECT COUNT(*) FROM mentorship_relationships WHERE status = 'active'
				) + (
					SELECT COUNT(*) FROM investment_relationships WHERE status IN ('active', 'accepted')
				) AS count`
    ),
    activityFeedService.getSummary({ userId, role: "Admin" }),
    pool.query(
      `SELECT
				(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS users_ok,
				(SELECT COUNT(*) FROM notifications WHERE is_read = false) AS unread_notifications,
				(SELECT COUNT(*) FROM messages WHERE is_read = false) AS unread_messages`
    ),
  ]);

  return {
    dashboard_summary: {
      total_users: totalUsers.rows[0]?.count || 0,
      total_startups: totalStartups.rows[0]?.count || 0,
      total_mentors: totalMentors.rows[0]?.count || 0,
      total_investors: totalInvestors.rows[0]?.count || 0,
      total_payments: payments.rows[0]?.revenue || 0,
      active_sessions: activeSessions.rows[0]?.count || 0,
      active_meetings: activeMeetings.rows[0]?.count || 0,
      active_relationships: activeRelationships.rows[0]?.count || 0,
    },
    recent_activity: recentActivity.recent,
    system_health: systemHealth.rows[0],
    activity_summary: recentActivity,
  };
}

module.exports = {
  getStartupDashboard,
  getMentorDashboard,
  getInvestorDashboard,
  getAdminDashboard,
  getUnreadMessageCount,
  getRecentMessages,
  getUpcomingMeetings,
  getUpcomingSessions,
  getRelationshipStatistics,
  getProjectProgress,
  getFundingProgress,
};
