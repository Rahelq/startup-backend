const Joi = require("joi");

const mentorshipProposalSchema = Joi.object({
  mentorship_id: Joi.number().integer().positive().required(),
  title: Joi.string().trim().min(3).max(160).required(),
  proposal_text: Joi.string().trim().min(10).required(),
  expected_outcomes: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
  estimated_weeks: Joi.number().integer().min(1).max(104).optional(),
  focus_area: Joi.string().trim().max(255).optional(),
  duration_weeks: Joi.number().integer().min(1).max(520).optional(),
  session_count: Joi.number().integer().min(1).max(100).optional(),
  frequency: Joi.string().trim().max(100).optional(),
  session_format: Joi.string().valid("one_to_one", "group").optional(),
  mode: Joi.string().valid("remote", "in_person").optional(),
  scope_objectives: Joi.string().trim().max(3000).optional(),
  milestones: Joi.alternatives().try(Joi.array(), Joi.object()).optional(),
});

const proposalStatusSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "sent", "negotiating", "accepted", "rejected", "cancelled")
    .required(),
});

const investmentOfferSchema = Joi.object({
  investment_id: Joi.number().integer().positive().required(),
  title: Joi.string().trim().min(3).max(160).required(),
  offer_text: Joi.string().allow("", null).optional(),
  funding_amount: Joi.number().positive().required(),
  equity_percentage: Joi.number().min(0).max(100).optional(),
  proposed_terms: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
  investment_type: Joi.string().trim().max(100).optional(),
  valuation_post_money: Joi.number().positive().optional(),
  milestones: Joi.alternatives().try(Joi.array(), Joi.object()).optional(),
  response_deadline: Joi.date().iso().optional(),
  note_to_founder: Joi.string().trim().max(2000).optional(),
});

const offerStatusSchema = Joi.object({
  status: Joi.string().valid("sent", "negotiating", "accepted", "rejected", "cancelled").required(),
});

const fundingRequestSchema = Joi.object({
  investment_id: Joi.number().integer().positive().required(),
  project_id: Joi.number().integer().positive().allow(null).optional(),
  title: Joi.string().trim().min(3).max(160).required(),
  request_text: Joi.string().allow("", null).optional(),
  amount_requested: Joi.number().positive().required(),
  use_of_funds: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
});

const fundingStatusSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "submitted", "under_review", "negotiating", "approved", "rejected", "withdrawn")
    .required(),
});

const negotiationSchema = Joi.object({
  parent_type: Joi.string()
    .valid("mentorship_proposal", "investment_offer", "funding_request")
    .required(),
  parent_id: Joi.number().integer().positive().required(),
  message: Joi.string().trim().min(1).required(),
  revision_data: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
});

const mentorshipRelationshipStatusSchema = Joi.object({
  status: Joi.string().valid("active", "paused", "completed", "terminated").required(),
});

const investmentRelationshipStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "pending",
      "active",
      "accepted",
      "rejected",
      "countered",
      "completed",
      "cancelled",
      "terminated"
    )
    .required(),
});

module.exports = {
  mentorshipProposalSchema,
  proposalStatusSchema,
  investmentOfferSchema,
  offerStatusSchema,
  fundingRequestSchema,
  fundingStatusSchema,
  negotiationSchema,
  mentorshipRelationshipStatusSchema,
  investmentRelationshipStatusSchema,
};
