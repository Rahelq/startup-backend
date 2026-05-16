const Joi = require("joi");

exports.createProjectWorkflowSchema = Joi.object({
  project_name: Joi.string().trim().min(2).max(255).optional(),
  project_title: Joi.string().trim().min(2).max(255).optional(),
  description: Joi.string().trim().max(4000).optional(),
  funding_goal: Joi.number().positive().required(),
  status: Joi.string().valid("draft", "active").optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
})
  .or("project_name", "project_title")
  .unknown(false);

exports.updateProjectWorkflowStatusSchema = Joi.object({
  status: Joi.string().valid("draft", "active", "funded", "completed", "cancelled").required(),
}).unknown(false);

exports.createProjectMilestoneWorkflowSchema = Joi.object({
  milestone_title: Joi.string().trim().min(2).max(255).required(),
  description: Joi.string().trim().max(4000).optional(),
  target_date: Joi.date().iso().optional(),
  deliverables: Joi.string().trim().max(4000).optional(),
  success_criteria: Joi.string().trim().max(4000).optional(),
  estimated_cost: Joi.number().min(0).optional(),
}).unknown(false);

exports.updateProjectMilestoneWorkflowSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "in_progress", "completed", "blocked", "cancelled")
    .required(),
  progress_notes: Joi.string().trim().max(4000).optional(),
  completion_date: Joi.date().iso().optional(),
}).unknown(false);

exports.uploadProjectDocumentWorkflowSchema = Joi.object({
  document_name: Joi.string().trim().min(2).max(255).required(),
  document_type: Joi.string().trim().max(100).optional(),
  file_url: Joi.string().uri().required(),
}).unknown(false);
