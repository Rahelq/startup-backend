const Joi = require("joi");

exports.createDocumentSchema = Joi.object({
  file_name: Joi.string().trim().max(255).required(),
  file_path: Joi.string().trim().required(),
  file_type: Joi.string().trim().max(50).required(),
  file_size_bytes: Joi.number().integer().positive().optional(),
  description: Joi.string().trim().max(500).optional(),
}).unknown(false);

exports.updateDocumentSchema = Joi.object({
  file_name: Joi.string().trim().max(255).optional(),
  description: Joi.string().trim().max(500).optional(),
}).unknown(false);
