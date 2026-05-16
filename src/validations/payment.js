const Joi = require("joi");

exports.createPaymentSchema = Joi.object({
  investment_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  payment_method: Joi.string()
    .valid("bank_transfer", "credit_card", "mobile_money", "other")
    .required(),
  transaction_reference: Joi.string().trim().max(200).optional(),
  notes: Joi.string().trim().max(1000).optional(),
}).unknown(false);

exports.updatePaymentSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  payment_method: Joi.string()
    .valid("bank_transfer", "credit_card", "mobile_money", "other")
    .optional(),
  status: Joi.string().valid("pending", "completed", "failed").optional(),
  transaction_reference: Joi.string().trim().max(200).optional(),
  notes: Joi.string().trim().max(1000).optional(),
}).unknown(false);
