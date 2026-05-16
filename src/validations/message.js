const Joi = require("joi");

exports.sendMessageSchema = Joi.object({
  conversation_id: Joi.number().integer().positive().optional(),
  receiver_id: Joi.number().integer().positive().required(),
  message: Joi.string().trim().max(5000).required(),
  message_type: Joi.string().valid("text", "image", "file", "audio").optional(),
  subject: Joi.string().trim().optional(),
  conversation_type: Joi.string().optional(),
}).unknown(false);

exports.markAsReadSchema = Joi.object({
  conversation_id: Joi.number().integer().positive().required(),
}).unknown(false);
