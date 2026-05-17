const reputationService = require("../services/reputationService");

async function getUserReputation(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const rep = await reputationService.calculateReputationForUser(userId);
    res.json({ reputation: rep });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUserReputation };
