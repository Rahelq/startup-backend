const Joi = require("joi");

exports.updateAdminInvestmentRequestStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "approved", "rejected", "withdrawn").required(),
  comment: Joi.string().trim().max(1000).optional(),
}).unknown(false);

exports.updateAdminProjectStatusSchema = Joi.object({
  status: Joi.string().valid("draft", "active", "funded", "completed", "cancelled").required(),
  comment: Joi.string().trim().max(1000).optional(),
}).unknown(false);

exports.clearOldAuditLogsSchema = Joi.object({
  days: Joi.number().integer().min(1).max(3650).optional(),
}).unknown(false);
