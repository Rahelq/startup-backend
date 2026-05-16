const pool = require("../config/db");
const startupModel = require("../models/startupModel");
const mentorModel = require("../models/mentorModel");
const investorModel = require("../models/investorModel");
const activityService = require("./activityService");

async function getRelatedUserIds(userId, role) {
  const ids = new Set([Number(userId)]);
  if (String(role).toLowerCase() === "startup") {
    const startup = await startupModel.findByUserId(userId);
    if (!startup) return [...ids];
    const mentorship = await pool.query(
      "SELECT mentor_id FROM mentorship_relationships WHERE startup_id = $1",
      [startup.startup_id]
    );
    const investment = await pool.query(
      "SELECT investor_id FROM investment_relationships WHERE startup_id = $1",
      [startup.startup_id]
    );
    mentorship.rows.forEach((row) => ids.add(row.mentor_id));
    investment.rows.forEach((row) => ids.add(row.investor_id));
  }
  if (String(role).toLowerCase() === "mentor") {
    const mentor = await mentorModel.findByUserId(userId);
    if (!mentor) return [...ids];
    const rels = await pool.query(
      "SELECT startup_id FROM mentorship_relationships WHERE mentor_id = $1",
      [mentor.mentor_id]
    );
    rels.rows.forEach((row) => ids.add(row.startup_id));
  }
  if (String(role).toLowerCase() === "investor") {
    const investor = await investorModel.findByUserId(userId);
    if (!investor) return [...ids];
    const rels = await pool.query(
      "SELECT startup_id FROM investment_relationships WHERE investor_id = $1",
      [investor.investor_id]
    );
    rels.rows.forEach((row) => ids.add(row.startup_id));
  }
  return [...ids];
}

async function getFeed({
  userId,
  role,
  limit = 25,
  page = 1,
  scope = "related",
  activityType = null,
}) {
  const maxLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const startPage = Math.max(Number(page) || 1, 1);
  const offset = (startPage - 1) * maxLimit;
  const filters = [];

  let feedQuery;
  let queryValues;
  if (String(scope).toLowerCase() === "global" || String(role).toLowerCase() === "admin") {
    queryValues = [maxLimit, offset];
    if (activityType) {
      queryValues.push(activityType);
      filters.push(`al.activity_type = $${queryValues.length}`);
    }
    feedQuery = `SELECT al.*, u.first_name, u.last_name, u.role AS actor_role
				     FROM activity_logs al
				     JOIN users u ON u.user_id = al.user_id
				     ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
				     ORDER BY al.created_at DESC
				     LIMIT $1 OFFSET $2`;
  } else if (String(scope).toLowerCase() === "mine") {
    queryValues = [Number(userId), maxLimit, offset];
    filters.unshift("al.user_id = $1");
    if (activityType) {
      queryValues.push(activityType);
      filters.push(`al.activity_type = $${queryValues.length}`);
    }
    feedQuery = `SELECT al.*, u.first_name, u.last_name, u.role AS actor_role
				     FROM activity_logs al
				     JOIN users u ON u.user_id = al.user_id
				     WHERE ${filters.join(" AND ")}
				     ORDER BY al.created_at DESC
				     LIMIT $2 OFFSET $3`;
  } else {
    const relatedIds = await getRelatedUserIds(userId, role);
    queryValues = [relatedIds, maxLimit, offset];
    filters.unshift(`al.user_id = ANY($1::int[])`);
    if (activityType) {
      queryValues.push(activityType);
      filters.push(`al.activity_type = $${queryValues.length}`);
    }
    feedQuery = `SELECT al.*, u.first_name, u.last_name, u.role AS actor_role
				     FROM activity_logs al
				     JOIN users u ON u.user_id = al.user_id
				     WHERE ${filters.join(" AND ")}
				     ORDER BY al.created_at DESC
				     LIMIT $2 OFFSET $3`;
  }

  const result = await pool.query(feedQuery, queryValues);
  return {
    page: startPage,
    limit: maxLimit,
    items: result.rows,
  };
}

async function getSummary({ userId, role }) {
  const feed = await getFeed({ userId, role, limit: 100, page: 1, scope: "related" });
  const byType = {};
  for (const item of feed.items) {
    byType[item.activity_type] = (byType[item.activity_type] || 0) + 1;
  }
  return {
    total: feed.items.length,
    by_type: byType,
    recent: feed.items.slice(0, 10),
  };
}

module.exports = {
  getFeed,
  getSummary,
  getRelatedUserIds,
  recordActivity: activityService.recordActivity,
};
