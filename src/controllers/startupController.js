const startupService = require("../services/startupService");

exports.getMyStartupProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await startupService.getStartupProfile(userId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.createStartupProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await startupService.createStartupProfile(
      userId,
      req.body,
      req.files
    );
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.updateStartupProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await startupService.updateStartupProfile(
      userId,
      req.body,
      req.files
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.searchInvestorsAndMentors = async (req, res) => {
  try {
    const result = await startupService.searchInvestorsAndMentors(req.query);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await startupService.getRecommendations(userId);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.getDashboardStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await startupService.getDashboardStatus(userId);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};
