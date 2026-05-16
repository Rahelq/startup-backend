const Joi = require("joi");

exports.createMentorshipOfferSchema = Joi.object({
  receiver_id: Joi.number().integer().positive().required(),
  message: Joi.string().trim().max(2000).optional(),
  type: Joi.string().valid("request", "invite").optional(),
}).unknown(false);

exports.setMentorPricingSchema = Joi.object({
  hourly_rate: Joi.number().min(0).required(),
  session_duration_minutes: Joi.number().integer().min(15).optional(),
  availability_json: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
}).unknown(false);

exports.bookMentorshipSessionSchema = Joi.object({
  mentorship_id: Joi.number().integer().positive().required(),
  session_start_at: Joi.date().iso().required(),
  session_end_at: Joi.date().iso().optional(),
  agenda: Joi.string().trim().max(2000).optional(),
}).unknown(false);

exports.recordSessionNotesSchema = Joi.object({
  notes: Joi.string().trim().max(5000).optional(),
  attendance_status: Joi.string().trim().max(100).optional(),
  progress_topics: Joi.array().items(Joi.string().trim().max(200)).optional(),
}).unknown(false);

exports.shareMentorshipResourceSchema = Joi.object({
  mentorship_id: Joi.number().integer().positive().required(),
  resource_title: Joi.string().trim().min(2).max(255).required(),
  resource_url: Joi.string().uri().required(),
  resource_type: Joi.string().trim().max(100).optional(),
}).unknown(false);
