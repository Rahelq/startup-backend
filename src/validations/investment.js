const Joi = require("joi");

exports.createInvestmentSchema = Joi.object({
  investment_request_id: Joi.number().integer().positive().optional(),
  investor_id: Joi.number().integer().positive().optional(),
  startup_id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().required(),
  equity: Joi.number().precision(2).min(0).max(100).optional(),
  investment_type: Joi.string().valid("equity", "debt", "convertible", "grant").optional(),
}).unknown(false);

exports.updateInvestmentSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  equity: Joi.number().precision(2).min(0).max(100).optional(),
  status: Joi.string().valid("active", "completed", "cancelled").optional(),
  investment_type: Joi.string().valid("equity", "debt", "convertible", "grant").optional(),
}).unknown(false);
