const blockService = require("../services/blockService");
const securityLogService = require("../services/securityLogService");

async function block(req, res, next) {
  try {
    const blockerId = req.user.user_id;
    const blockedId = Number(req.params.userId);
    const { reason } = req.body || {};
    const r = await blockService.blockUser(blockerId, blockedId, reason);
    await securityLogService.recordEvent(blockerId, "user_blocked", "low", req.ip, {
      blockedId,
      reason,
    });
    res.json({ data: r });
  } catch (err) {
    next(err);
  }
}

async function unblock(req, res, next) {
  try {
    const blockerId = req.user.user_id;
    const blockedId = Number(req.params.userId);
    const r = await blockService.unblockUser(blockerId, blockedId);
    await securityLogService.recordEvent(blockerId, "user_unblocked", "low", req.ip, { blockedId });
    res.json({ data: r });
  } catch (err) {
    next(err);
  }
}

async function listBlocked(req, res, next) {
  try {
    const blockerId = req.user.user_id;
    const rows = await blockService.listBlocked(blockerId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { block, unblock, listBlocked };
