const Joi = require("joi");

exports.createNotificationSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  message: Joi.string().trim().max(2000).required(),
  notification_type: Joi.string().max(100).required(),
  related_entity_id: Joi.number().integer().optional(),
  related_entity_type: Joi.string().max(100).optional(),
}).unknown(false);

exports.markAsReadSchema = Joi.object({
  notification_id: Joi.number().integer().positive().optional(),
}).unknown(false);
