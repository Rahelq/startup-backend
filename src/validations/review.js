const Joi = require("joi");

exports.createReviewSchema = Joi.object({
  mentor_id: Joi.number().integer().positive().required(),
  startup_id: Joi.number().integer().positive().optional(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().max(2000).optional(),
  review_type: Joi.string().max(100).optional(),
}).unknown(false);

exports.updateReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).optional(),
  comment: Joi.string().trim().max(2000).optional(),
}).unknown(false);
