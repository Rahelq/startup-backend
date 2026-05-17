const intelligenceService = require("../services/intelligenceService");

async function recalcUser(req, res, next) {
  try {
    const userId = Number(req.params.userId || req.user.user_id);
    const r = await intelligenceService.recalculateUserIntelligence(userId);
    res.json(r);
  } catch (err) {
    next(err);
  }
}

async function snapshotPlatform(req, res, next) {
  try {
    const r = await intelligenceService.snapshotPlatform();
    res.json(r);
  } catch (err) {
    next(err);
  }
}

module.exports = { recalcUser, snapshotPlatform };
