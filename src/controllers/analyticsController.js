const analyticsService = require("../services/analyticsService");

async function getMentor(req, res, next) {
  try {
    const userId = Number(req.params.userId || req.user.user_id);
    const d = await analyticsService.getMentorAnalytics(userId);
    res.json({ analytics: d });
  } catch (err) {
    next(err);
  }
}

async function getStartup(req, res, next) {
  try {
    const userId = Number(req.params.userId || req.user.user_id);
    const d = await analyticsService.getStartupAnalytics(userId);
    res.json({ analytics: d });
  } catch (err) {
    next(err);
  }
}

async function getPlatform(req, res, next) {
  try {
    const d = await analyticsService.getPlatformAnalytics();
    res.json({ analytics: d });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMentor, getStartup, getPlatform };
