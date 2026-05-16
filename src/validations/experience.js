const Joi = require("joi");

const dashboardQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
  section: Joi.string()
    .valid("summary", "activity", "messages", "notifications", "recommendations")
    .optional(),
  include_archived: Joi.boolean().truthy("true").falsy("false").default(false),
});

const activityFeedQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(25),
  page: Joi.number().integer().min(1).default(1),
  scope: Joi.string().valid("mine", "related", "global").default("related"),
  activity_type: Joi.string().trim().min(2).max(100).optional(),
});

const recommendationFilterSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort: Joi.string()
    .valid("recommended", "trending", "recently_active", "newest", "active")
    .default("recommended"),
  industry: Joi.string().trim().min(1).max(120).optional(),
  stage: Joi.string().trim().min(1).max(120).optional(),
  q: Joi.string().trim().min(1).max(200).optional(),
});

module.exports = {
  dashboardQuerySchema,
  activityFeedQuerySchema,
  recommendationFilterSchema,
};
