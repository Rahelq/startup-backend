const Joi = require("joi");

exports.createInvestmentOfferSchema = Joi.object({
  receiver_id: Joi.number().integer().positive().required(),
  funding_amount: Joi.number().positive().required(),
  equity_percentage: Joi.number().min(0).max(100).optional(),
  message: Joi.string().trim().max(2000).optional(),
  type: Joi.string().valid("request", "invite").optional(),
}).unknown(false);

exports.submitCounterOfferSchema = Joi.object({
  funding_amount: Joi.number().positive().optional(),
  equity_percentage: Joi.number().min(0).max(100).optional(),
  message: Joi.string().trim().max(2000).optional(),
})
  .or("funding_amount", "equity_percentage", "message")
  .unknown(false);

exports.respondInvestmentOfferSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required(),
}).unknown(false);

exports.recordInvestmentPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  payment_status: Joi.string().valid("pending", "completed", "escrowed", "released").required(),
  payment_method: Joi.string().trim().max(100).optional(),
  notes: Joi.string().trim().max(2000).optional(),
}).unknown(false);

exports.submitStartupFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(2000).optional(),
}).unknown(false);
