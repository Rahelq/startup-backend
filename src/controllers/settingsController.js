const settingsService = require("../services/settingsService");
const {
  settingsSchema,
  privacySchema,
  notificationPreferencesSchema,
} = require("../validations/settings");
const validate = require("../middleware/validate");

async function getSettings(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await settingsService.getSettings(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { error } = settingsSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const updated = await settingsService.upsertSettings(userId, req.body);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function getPrivacy(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await settingsService.getPrivacy(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function updatePrivacy(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { error } = privacySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const normalizedBody = {
      ...req.body,
      profile_visibility:
        req.body.profile_visibility === "connections_only"
          ? "connections"
          : req.body.profile_visibility,
    };
    const updated = await settingsService.upsertPrivacy(userId, normalizedBody);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function getNotificationPreferences(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await settingsService.getNotificationPreferences(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateNotificationPreferences(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { error } = notificationPreferencesSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    await settingsService.upsertNotificationPreferences(userId, req.body);
    const updated = await settingsService.getNotificationPreferences(userId);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  getPrivacy,
  updatePrivacy,
  getNotificationPreferences,
  updateNotificationPreferences,
};
