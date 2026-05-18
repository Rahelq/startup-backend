const twoFactorService = require("../services/twoFactorService");
const securityLogService = require("../services/securityLogService");

async function setup(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await twoFactorService.createSetup(userId);
    await securityLogService.recordEvent(userId, "2fa_setup_initiated", "medium", req.ip, {});
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { token } = req.body || {};
    const ok = await twoFactorService.verifyToken(userId, token);
    if (ok) {
      await twoFactorService.enable(userId);
      await securityLogService.recordEvent(userId, "2fa_enabled", "medium", req.ip, {});
      return res.json({ success: true });
    }
    res.status(400).json({ success: false });
  } catch (err) {
    next(err);
  }
}

async function disable(req, res, next) {
  try {
    const userId = req.user.user_id;
    await twoFactorService.disable(userId);
    await securityLogService.recordEvent(userId, "2fa_disabled", "medium", req.ip, {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getQRCode(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await twoFactorService.getSetupQRCode(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function redeemBackup(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { code } = req.body || {};
    const ok = await twoFactorService.redeemBackupCode(userId, code);
    if (ok) {
      await securityLogService.recordEvent(userId, "2fa_backup_redeemed", "medium", req.ip, {});
      return res.json({ success: true });
    }
    res.status(400).json({ success: false });
  } catch (err) {
    next(err);
  }
}

module.exports = { setup, verify, disable, getQRCode, redeemBackup };
