const Joi = require("joi");

const settingsSchema = Joi.object({
  language: Joi.string().max(16),
  theme: Joi.string().valid("light", "dark"),
  timezone: Joi.string().max(64),
  date_format: Joi.string().max(32),
  time_format: Joi.string().max(32),
  text_size: Joi.string().valid("small", "medium", "large"),
  high_contrast: Joi.boolean(),
  reduce_motion: Joi.boolean(),
  dashboard_layout: Joi.object().optional(),
});

const privacySchema = Joi.object({
  profile_visibility: Joi.string().valid("public", "platform_only", "connections_only", "private"),
  show_email: Joi.boolean(),
  show_phone: Joi.boolean(),
  show_location: Joi.boolean(),
  show_activity_status: Joi.boolean(),
  show_online_status: Joi.boolean(),
  allow_messages_from: Joi.string().valid("everyone", "connections_only", "nobody"),
});

const notificationPreferencesSchema = Joi.object({
  email_digest_frequency: Joi.string().valid("instant", "daily", "weekly", "disabled"),
});

module.exports = { settingsSchema, privacySchema, notificationPreferencesSchema };
