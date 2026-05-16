const securityLogService = require("../services/securityLogService");

module.exports = function auditSecurityEvent(eventType, severity = "low") {
  return async (req, res, next) => {
    try {
      const userId = req.user && req.user.user_id;
      await securityLogService.recordEvent(userId, eventType, severity, req.ip, {
        path: req.path,
        method: req.method,
      });
    } catch (e) {
      // ignore logging failures
    }
    next();
  };
};
