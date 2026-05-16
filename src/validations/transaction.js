const Joi = require("joi");

const paymentType = Joi.string()
  .valid(
    "mentorship_session",
    "mentorship_plan",
    "investment_funding",
    "milestone_release",
    "consultation",
    "subscription",
    "platform_fee"
  )
  .required();

exports.initializeTransactionPaymentSchema = Joi.object({
  relationship_id: Joi.number().integer().positive().required(),
  payment_type: paymentType,
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().max(10).default("ETB"),
  session_id: Joi.number().integer().positive().optional(),
  proposal_id: Joi.number().integer().positive().optional(),
  investment_offer_id: Joi.number().integer().positive().optional(),
  funding_request_id: Joi.number().integer().positive().optional(),
  reference_type: Joi.string().trim().max(100).optional(),
  reference_id: Joi.number().integer().positive().optional(),
  equity_percentage: Joi.number().min(0).max(100).optional(),
  milestone_reference: Joi.string().trim().max(120).optional(),
  payment_method: Joi.string().trim().max(60).optional(),
  idempotency_key: Joi.string().trim().max(150).optional(),
  description: Joi.string().trim().max(2000).optional(),
  callback_url: Joi.string().uri().optional(),
  return_url: Joi.string().uri().optional(),
}).unknown(false);

exports.verifyTransactionSchema = Joi.object({
  tx_ref: Joi.string().trim().max(255).required(),
}).unknown(false);

exports.refundRequestSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  reason: Joi.string().trim().max(1500).required(),
}).unknown(false);

exports.adminRefundDecisionSchema = Joi.object({
  approve: Joi.boolean().required(),
  notes: Joi.string().trim().max(1500).optional(),
}).unknown(false);

exports.transactionHistoryQuerySchema = Joi.object({
  status: Joi.string()
    .valid("pending", "processing", "completed", "failed", "refunded", "cancelled")
    .optional(),
  payment_type: Joi.string()
    .valid(
      "mentorship_session",
      "mentorship_plan",
      "investment_funding",
      "milestone_release",
      "consultation",
      "subscription",
      "platform_fee"
    )
    .optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
}).unknown(false);
