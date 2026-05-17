const recommendationService = require("../services/recommendationService");

async function recommendMentors(req, res, next) {
  try {
    const userId = Number(req.params.userId || req.user.user_id);
    const industry = req.query.industry || null;
    const rs = await recommendationService.recommendMentorsForStartup(userId, {
      industry,
      limit: Number(req.query.limit) || 10,
    });
    res.json({ recommendations: rs });
  } catch (err) {
    next(err);
  }
}

module.exports = { recommendMentors };
