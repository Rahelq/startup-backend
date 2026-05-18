const ratingService = require("../services/ratingService");
const feedbackService = require("../services/feedbackService");
const activityService = require("../services/activityService");

async function createRating(req, res, next) {
  try {
    const body = req.body || {};
    const payload = {
      relationship_id: body.relationship_id || null,
      relationship_type: body.relationship_type || null,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      reviewer_id: req.user.user_id,
      reviewed_user_id: body.reviewed_user_id,
      rating: Number(body.rating),
      title: body.title || null,
      review: body.review || null,
      communication_rating: body.communication_rating || null,
      professionalism_rating: body.professionalism_rating || null,
      expertise_rating: body.expertise_rating || null,
      value_rating: body.value_rating || null,
      responsiveness_rating: body.responsiveness_rating || null,
      is_anonymous: !!body.is_anonymous,
    };
    const r = await ratingService.createRating(payload);
    res.status(201).json({ rating: r });
  } catch (err) {
    next(err);
  }
}

async function listEntityRatings(req, res, next) {
  try {
    const { entityType, entityId } = req.params;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const rows = await ratingService.listForEntity(entityType, Number(entityId), { limit, offset });
    res.json({ ratings: rows, limit, offset });
  } catch (err) {
    next(err);
  }
}

async function reportRating(req, res, next) {
  try {
    const ratingId = Number(req.params.id);
    const { reason, description } = req.body || {};
    const rpt = await feedbackService.reportRating({
      rating_id: ratingId,
      reported_by: req.user.user_id,
      reason,
      description,
    });
    res.status(201).json({ report: rpt });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRating, listEntityRatings, reportRating };
