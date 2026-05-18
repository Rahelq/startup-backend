const Joi = require("joi");

const projectCreateSchema = Joi.object({
  project_title: Joi.string().min(3).required(),
  description: Joi.string().optional(),
  funding_goal: Joi.number().positive().required(),
  category: Joi.string().trim().max(120).optional(),
  stage: Joi.string().trim().max(120).optional(),
  problem: Joi.string().trim().max(2000).optional(),
  solution: Joi.string().trim().max(2000).optional(),
  business_model: Joi.string().trim().max(2000).optional(),
  market_opportunity: Joi.string().trim().max(2000).optional(),
  status: Joi.string().valid("active", "completed", "paused").optional(),
});

const projectUpdateSchema = Joi.object({
  project_title: Joi.string().min(3).optional(),
  description: Joi.string().optional(),
  funding_goal: Joi.number().positive().optional(),
  status: Joi.string().valid("active", "completed", "paused").optional(),
});

module.exports = { projectCreateSchema, projectUpdateSchema };
