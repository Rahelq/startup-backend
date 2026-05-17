const ratingService = require("../services/ratingService");
const feedbackService = require("../services/feedbackService");
const activityService = require("../services/activityService");

async function createRating(req, res, next) {
  try {
    const payload = {
      relationship_id: req.body.relationship_id || null,
      relationship_type: req.body.relationship_type || null,
      entity_type: req.body.entity_type,
      entity_id: req.body.entity_id,
      reviewer_id: req.user.user_id,
      reviewed_user_id: req.body.reviewed_user_id,
      rating: Number(req.body.rating),
      title: req.body.title || null,
      review: req.body.review || null,
      communication_rating: req.body.communication_rating || null,
      professionalism_rating: req.body.professionalism_rating || null,
      expertise_rating: req.body.expertise_rating || null,
      value_rating: req.body.value_rating || null,
      responsiveness_rating: req.body.responsiveness_rating || null,
      is_anonymous: !!req.body.is_anonymous,
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
    const { reason, description } = req.body;
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
