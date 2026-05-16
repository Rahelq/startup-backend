const Joi = require("joi");

exports.createInteractionRequestSchema = Joi.object({
  receiver_id: Joi.number().integer().positive().required(),
  type: Joi.string().valid("request", "invite").required(),
  category: Joi.string().valid("mentorship", "investment").required(),
  message: Joi.string().trim().max(2000).optional(),
  funding_amount: Joi.number().positive().optional(),
  equity_offer: Joi.number().min(0).max(100).optional(),
}).unknown(false);

exports.respondInteractionRequestSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required(),
}).unknown(false);
