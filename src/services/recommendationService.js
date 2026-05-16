const startupModel = require("../models/startupModel");
const mentorModel = require("../models/mentorModel");
const investorModel = require("../models/investorModel");
const discoveryService = require("./discoveryService");

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
  getStartupRecommendations,
  getMentorRecommendations,
  getInvestorRecommendations,
};
