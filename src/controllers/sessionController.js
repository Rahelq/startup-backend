const sessionService = require("../services/sessionService");
const securityLogService = require("../services/securityLogService");
const notificationService = require("../services/notificationService");

async function listSessions(req, res, next) {
  try {
    const userId = req.user.user_id;
    const rows = await sessionService.listSessions(userId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function revokeSession(req, res, next) {
  try {
    const userId = req.user.user_id;
    const id = Number(req.params.id);
    const r = await sessionService.revokeSession(userId, id);
    if (r) {
      await securityLogService.recordEvent(userId, "session_revoked", "medium", req.ip, {
        sessionId: id,
      });
      await notificationService.createNotification({
        userId,
        notificationType: "security",
        title: "Session revoked",
        message: "A session was revoked from your account.",
      });
    }
    res.json({ data: r });
  } catch (err) {
    next(err);
  }
}

async function revokeAll(req, res, next) {
  try {
    const userId = req.user.user_id;
    await sessionService.revokeAllSessions(userId);
    await securityLogService.recordEvent(userId, "session_revoked_all", "medium", req.ip, {});
    await notificationService.createNotification({
      userId,
      notificationType: "security",
      title: "All sessions revoked",
      message: "All sessions were revoked from your account.",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSessions, revokeSession, revokeAll };
