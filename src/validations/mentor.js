const Joi = require("joi");

const mentorCreateSchema = Joi.object({
  headline: Joi.string().optional(),
  expertise: Joi.string().optional(),
  expertise_area: Joi.string().optional(),
  years_experience: Joi.number().integer().min(0).optional(),
  hourly_rate: Joi.number().positive().optional(),
  country: Joi.string().optional(),
  bio: Joi.string().optional(),
  availability: Joi.string().optional(),
  skills: Joi.string().optional(),
  industries: Joi.string().optional(),
  full_name: Joi.string().optional(),
  city: Joi.string().optional(),
  linkedin_url: Joi.string().optional(),
  portfolio_url: Joi.string().optional(),
}).unknown(true);

const mentorUpdateSchema = mentorCreateSchema;

module.exports = { mentorCreateSchema, mentorUpdateSchema };
