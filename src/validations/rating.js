const Joi = require("joi");

const ratingSchema = Joi.object({
  relationship_id: Joi.number().integer().allow(null),
  relationship_type: Joi.string().valid("mentorship", "investment").allow(null),
  entity_type: Joi.string()
    .valid(
      "mentor",
      "startup",
      "investor",
      "session",
      "meeting",
      "project",
      "milestone",
      "relationship"
    )
    .required(),
  entity_id: Joi.number().integer().required(),
  reviewed_user_id: Joi.number().integer().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(255).allow(null, "").optional(),
  review: Joi.string().max(2000).allow(null, "").optional(),
  communication_rating: Joi.number().integer().min(1).max(5).allow(null),
  professionalism_rating: Joi.number().integer().min(1).max(5).allow(null),
  expertise_rating: Joi.number().integer().min(1).max(5).allow(null),
  value_rating: Joi.number().integer().min(1).max(5).allow(null),
  responsiveness_rating: Joi.number().integer().min(1).max(5).allow(null),
  is_anonymous: Joi.boolean().optional(),
});

const reportSchema = Joi.object({
  reason: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).optional(),
});

module.exports = { ratingSchema, reportSchema };
