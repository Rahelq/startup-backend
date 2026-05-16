const Joi = require("joi");

const projectCreateSchema = Joi.object({
	project_title: Joi.string().min(3).required(),
	description: Joi.string().optional(),
	funding_goal: Joi.number().positive().optional(),
	status: Joi.string().valid("active", "completed", "paused").optional(),
});

const projectUpdateSchema = Joi.object({
	project_title: Joi.string().min(3).optional(),
	description: Joi.string().optional(),
	funding_goal: Joi.number().positive().optional(),
	status: Joi.string().valid("active", "completed", "paused").optional(),
});

module.exports = { projectCreateSchema, projectUpdateSchema };
