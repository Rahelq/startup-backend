const pool = require("../config/db");
const recommendationHelper = require("../utils/recommendationHelper");
const startupModel = require("../models/startupModel");
const mentorModel = require("../models/mentorModel");
const investorModel = require("../models/investorModel");
const discoveryService = require("./discoveryService");

async function recommendMentorsForStartup(userId, { industry = null, limit = 10 } = {}) {
  // Find mentors matching industry or who interacted frequently; simple heuristic
  const q = await pool.query(
    `SELECT u.user_id, m.mentor_id, u.first_name, u.last_name, coalesce(avg_rating,0)::numeric AS rating
     FROM mentors m
     JOIN users u ON u.user_id = m.user_id
     LEFT JOIN (
       SELECT reviewed_user_id, AVG(rating) AS avg_rating FROM ratings WHERE status='active' GROUP BY reviewed_user_id
     ) ar ON ar.reviewed_user_id = u.user_id
     WHERE (
       $1::text IS NULL
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(COALESCE(m.industries, '[]'::jsonb)) AS ind(value)
         WHERE LOWER(ind.value) = LOWER($1::text)
       )
       OR COALESCE(m.expertise, '') ILIKE ('%' || $1::text || '%')
     )
     LIMIT $2`,
    [industry, limit]
  );

  const candidates = q.rows.map((r) => ({
    id: r.user_id,
    mentor_id: r.mentor_id,
    name: `${r.first_name} ${r.last_name}`,
    rating: Number(r.rating || 0),
    industries: [],
    engagement: 50,
    availabilityScore: 0.5,
  }));

  // Score candidates
  const results = candidates.map((c) => ({
    candidate: c,
    score: recommendationHelper.compatibilityScore(c, { industry, minRating: 3.5 }),
  }));
  results.sort((a, b) => b.score - a.score);

  // Persist top recommendations
  await Promise.all(
    results
      .slice(0, limit)
      .map((r) =>
        pool.query(
          "INSERT INTO recommendation_scores (user_id, target_id, target_type, score, reason, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
          [userId, r.candidate.id, "mentor", r.score, "industry_match", { candidate: r.candidate }]
        )
      )
  ).catch(() => {});

  return results.map((r) => ({ ...r.candidate, score: r.score }));
}

async function getStartupRecommendations(userId, query = {}) {
  const startup = await startupModel.findByUserId(userId);
  if (!startup) {
    const err = new Error("Startup profile not found");
    err.status = 404;
    throw err;
  }

  const [mentors, investors, projects] = await Promise.all([
    discoveryService.getDiscoveryMentors({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "recommended",
      q: query.q || startup.industry || startup.business_stage,
      country: startup.location || query.country,
    }),
    discoveryService.getDiscoveryInvestors({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "recommended",
      q: query.q || startup.industry || startup.business_stage,
      country: query.country || startup.location,
    }),
    discoveryService.getDiscoveryProjects({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "trending",
      q: query.q || startup.industry || startup.business_stage,
    }),
  ]);

  return {
    mentors: mentors.items,
    investors: investors.items,
    projects: projects.items,
    sessions: [],
    resources: [],
  };
}

async function getMentorRecommendations(userId, query = {}) {
  const mentor = await mentorModel.findByUserId(userId);
  if (!mentor) {
    const err = new Error("Mentor profile not found");
    err.status = 404;
    throw err;
  }

  const [startups, projects] = await Promise.all([
    discoveryService.getDiscoveryStartups({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "recommended",
      q: query.q || mentor.expertise || mentor.industries,
      country: query.country || mentor.country,
    }),
    discoveryService.getDiscoveryProjects({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "trending",
      q: query.q || mentor.expertise || mentor.industries,
    }),
  ]);

  return { startups: startups.items, projects: projects.items, resources: [], sessions: [] };
}

async function getInvestorRecommendations(userId, query = {}) {
  const investor = await investorModel.findByUserId(userId);
  if (!investor) {
    const err = new Error("Investor profile not found");
    err.status = 404;
    throw err;
  }

  const [startups, projects] = await Promise.all([
    discoveryService.getDiscoveryStartups({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "recommended",
      q: query.q || investor.preferred_industry || investor.investment_stage,
      country: query.country || investor.country,
    }),
    discoveryService.getDiscoveryProjects({
      ...query,
      limit: query.limit || 10,
      sort: query.sort || "trending",
      q: query.q || investor.preferred_industry || investor.investment_stage,
    }),
  ]);

  return {
    startups: startups.items,
    projects: projects.items,
    funding_opportunities: [],
    resources: [],
  };
}

module.exports = {
  recommendMentorsForStartup,
  getStartupRecommendations,
  getMentorRecommendations,
  getInvestorRecommendations,
};
