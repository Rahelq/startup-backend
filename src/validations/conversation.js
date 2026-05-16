const Joi = require("joi");

exports.createConversationSchema = Joi.object({
  user1_id: Joi.number().integer().positive().required(),
  user2_id: Joi.number().integer().positive().required(),
  conversation_type: Joi.string().optional(),
}).unknown(false);

exports.updateConversationSchema = Joi.object({
  conversation_type: Joi.string().optional(),
  is_archived: Joi.boolean().optional(),
}).unknown(false);
