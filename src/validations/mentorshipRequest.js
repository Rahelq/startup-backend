const Joi = require("joi");

exports.createMentorshipRequestSchema = Joi.object({
  mentor_id: Joi.number().integer().positive().required(),
  subject: Joi.string().trim().min(5).max(200).required(),
  message: Joi.string().trim().max(2000).optional(),
}).unknown(false);

exports.respondToMentorshipRequestSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected", "pending").required(),
  message: Joi.string().trim().max(500).optional(),
}).unknown(false);

exports.updateMentorshipRequestSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected", "pending").optional(),
  subject: Joi.string().trim().min(5).max(200).optional(),
  message: Joi.string().trim().max(2000).optional(),
}).unknown(false);
