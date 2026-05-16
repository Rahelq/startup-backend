const Joi = require("joi");

exports.createInteractionSchema = Joi.object({
  interaction_type: Joi.string().max(100).required(),
  entity_type: Joi.string().max(100).required(),
  entity_id: Joi.number().integer().positive().required(),
  metadata: Joi.object().optional(),
  description: Joi.string().trim().max(1000).optional(),
}).unknown(false);

exports.updateInteractionSchema = Joi.object({
  metadata: Joi.object().optional(),
  description: Joi.string().trim().max(1000).optional(),
}).unknown(false);
