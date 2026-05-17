const aggregationService = require("./aggregationService");
const scoringService = require("./scoringService");
const recommendationService = require("./recommendationService");
const activityService = require("./activityService");

async function recalculateUserIntelligence(userId) {
  const score = await scoringService.computeScoresForUser(userId);
  // create a recommendation refresh for the user (e.g., recommend mentors)
  const recos = await recommendationService.recommendMentorsForStartup(userId, { limit: 5 });
  await activityService.recordActivity({
    userId,
    activityType: "score_updated",
    metadata: { score },
  });
  return { score, recos };
}

async function snapshotPlatform() {
  return aggregationService.snapshotPlatformMetrics();
}

module.exports = { recalculateUserIntelligence, snapshotPlatform };
