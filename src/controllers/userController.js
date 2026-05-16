const userService = require("../services/userService");

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await userService.getMyProfile(userId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await userService.updateMyProfile(userId, req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
};

exports.submitProfileForReview = async (req, res) => {
  try {
    const result = await userService.submitProfileForReview(req.user.user_id);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};
