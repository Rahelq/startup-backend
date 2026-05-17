const ratingService = require("../services/ratingService");
const feedbackService = require("../services/feedbackService");
const reputationService = require("../services/reputationService");

function parsePagination(query) {
  return {
    limit: Number(query.limit) || 50,
    offset: Number(query.offset) || 0,
    status: query.status || null,
    entityType: query.entity_type || query.entityType || null,
  };
}

async function listRatings(req, res, next) {
  try {
    const ratings = await ratingService.listModerationQueue(parsePagination(req.query));
    res.json({ ratings });
  } catch (error) {
    next(error);
  }
}

async function listReports(req, res, next) {
  try {
    const reports = await ratingService.listReports(parsePagination(req.query));
    res.json({ reports });
  } catch (error) {
    next(error);
  }
}

async function hideRating(req, res, next) {
  try {
    const updated = await ratingService.moderateRating({
      ratingId: Number(req.params.ratingId),
      status: "hidden",
      moderatorId: req.user.user_id,
      reason: req.body.reason || null,
    });
    await reputationService.calculateReputationForUser(updated.reviewed_user_id);
    res.json({ rating: updated });
  } catch (error) {
    next(error);
  }
}

async function removeRating(req, res, next) {
  try {
    const updated = await ratingService.moderateRating({
      ratingId: Number(req.params.ratingId),
      status: "removed",
      moderatorId: req.user.user_id,
      reason: req.body.reason || null,
    });
    await reputationService.calculateReputationForUser(updated.reviewed_user_id);
    res.json({ rating: updated });
  } catch (error) {
    next(error);
  }
}

async function restoreRating(req, res, next) {
  try {
    const updated = await ratingService.moderateRating({
      ratingId: Number(req.params.ratingId),
      status: "active",
      moderatorId: req.user.user_id,
      reason: req.body.reason || null,
    });
    await reputationService.calculateReputationForUser(updated.reviewed_user_id);
    res.json({ rating: updated });
  } catch (error) {
    next(error);
  }
}

async function reviewReport(req, res, next) {
  try {
    const report = await feedbackService.resolveReport(
      Number(req.params.reportId),
      req.body.status || "reviewed",
      req.user.user_id
    );
    res.json({ report });
  } catch (error) {
    next(error);
  }
}

async function banReviewer(req, res, next) {
  try {
    const updated = await ratingService.banReviewer({
      userId: Number(req.params.userId),
      moderatorId: req.user.user_id,
      reason: req.body.reason || null,
    });
    res.json({ reviewer: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listRatings,
  listReports,
  hideRating,
  removeRating,
  restoreRating,
  reviewReport,
  banReviewer,
};
