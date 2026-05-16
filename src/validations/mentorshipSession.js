const Joi = require("joi");

exports.createMentorshipSessionSchema = Joi.object({
  mentorship_request_id: Joi.number().integer().positive().required(),
  session_date: Joi.date().iso().required(),
  duration: Joi.number().integer().positive().optional(),
  notes: Joi.string().trim().max(2000).optional(),
}).unknown(false);

exports.updateMentorshipSessionSchema = Joi.object({
  session_date: Joi.date().iso().optional(),
  duration: Joi.number().integer().positive().optional(),
  status: Joi.string().valid("scheduled", "completed", "cancelled").optional(),
  notes: Joi.string().trim().max(2000).optional(),
}).unknown(false);

exports.getAvailabilitySchema = Joi.object({
  availability: Joi.object().optional(),
}).unknown(false);

exports.updateAvailabilitySchema = Joi.object({
  availability: Joi.object().required(),
}).unknown(false);
