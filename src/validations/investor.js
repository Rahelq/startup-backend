const Joi = require("joi");

const jsonLike = Joi.alternatives().try(Joi.string(), Joi.array(), Joi.object());

const investorCreateSchema = Joi.object({
  investor_type: Joi.string()
    .valid("Angel", "VC", "Corporate", "Government", "Venture Capital")
    .optional(),
  organization_name: Joi.string().optional(),
  investment_budget: Joi.number().positive().optional(),
  preferred_industry: Joi.string().optional(),
  investment_stage: Joi.string().valid("Pre-seed", "Seed", "Series A", "Series B").optional(),
  country: Joi.string().optional(),
  portfolio_size: Joi.number().integer().min(0).optional(),
  investment_focus: jsonLike.optional(),
  industries: jsonLike.optional(),
  funding_range_min: Joi.number().positive().optional(),
  funding_range_max: Joi.number().positive().optional(),
  bio: Joi.string().optional(),
}).unknown(true);

const investorUpdateSchema = investorCreateSchema;

module.exports = { investorCreateSchema, investorUpdateSchema };
