const Joi = require("joi");

const startupCreateSchema = Joi.object({
  startup_name: Joi.string().min(3).required(),
  industry: Joi.string().required(),
  description: Joi.string().optional(),
  business_stage: Joi.string().valid("Idea", "MVP", "Seed", "Series A", "Series B").optional(),
  founded_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
  team_size: Joi.number().integer().min(1).optional(),
  location: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  funding_needed: Joi.number().positive().optional(),
}).unknown(true);

const startupUpdateSchema = Joi.object({
  startup_name: Joi.string().min(3).optional(),
  industry: Joi.string().optional(),
  description: Joi.string().optional(),
  business_stage: Joi.string().valid("Idea", "MVP", "Seed", "Series A", "Series B").optional(),
  team_size: Joi.number().integer().min(1).optional(),
  location: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  funding_needed: Joi.number().positive().optional(),
}).unknown(true);

module.exports = { startupCreateSchema, startupUpdateSchema };
