const Joi = require("joi");

const settingsSchema = Joi.object({
  timezone: Joi.string().max(64).optional(),
  language: Joi.string().max(16).optional(),
  preferences: Joi.object().optional(),
}).unknown(true);

const privacySchema = Joi.object({
  profile_visibility: Joi.string()
    .valid("private", "public", "connections", "connections_only")
    .optional(),
  show_email: Joi.boolean().optional(),
  show_phone: Joi.boolean().optional(),
  data_sharing: Joi.object().optional(),
}).unknown(true);

const notificationPreferencesSchema = Joi.object({
  channels: Joi.object().optional(),
  preferences: Joi.object().optional(),
}).unknown(true);

module.exports = { settingsSchema, privacySchema, notificationPreferencesSchema };
