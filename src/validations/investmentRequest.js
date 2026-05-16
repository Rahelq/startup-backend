const Joi = require("joi");

exports.createInvestmentRequestSchema = Joi.object({
  startup_id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().required(),
  equity: Joi.number().precision(2).min(0).max(100).optional(),
  description: Joi.string().trim().max(2000).optional(),
}).unknown(false);

exports.respondToInvestmentRequestSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected", "pending").required(),
  message: Joi.string().trim().max(500).optional(),
}).unknown(false);

exports.updateInvestmentRequestSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  equity: Joi.number().precision(2).min(0).max(100).optional(),
  description: Joi.string().trim().max(2000).optional(),
  status: Joi.string().valid("accepted", "rejected", "pending").optional(),
}).unknown(false);
