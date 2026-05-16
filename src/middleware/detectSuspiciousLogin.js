const suspiciousService = require("../services/suspiciousService");

module.exports = function detectSuspiciousLogin() {
  return async (req, res, next) => {
    try {
      if (!req.user) return next();
      const userId = req.user.user_id;
      const deviceId = req.headers["x-device-id"];
      const ip = req.ip;
      const result = await suspiciousService.assessSuspicion({ userId, ip, deviceId });
      if (result && result.suspicious) {
        // attach flag for downstream
        req.suspiciousLogin = result;
      }
    } catch (e) {
      // ignore
    }
    next();
  };
};
