const pool = require("../config/db");
const { ratingSchema, reportSchema } = require("../validations/rating");
const ratingService = require("../services/ratingService");

function validateRatingPayload(req, res, next) {
  const { error, value } = ratingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  req.body = value;
  next();
}

function validateReportPayload(req, res, next) {
  const { error, value } = reportSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  req.body = value;
  next();
}

async function requireRelationshipParticipant(req, res, next) {
  try {
    const relationshipId = req.body.relationship_id || req.body.relationshipId;
    const relationshipType = req.body.relationship_type || req.body.relationshipType;
    if (!relationshipId || !relationshipType) return next();

    const reviewerId = req.user.user_id;
    if (String(relationshipType).toLowerCase() === "mentorship") {
      const result = await pool.query(
        "SELECT 1 FROM mentorship_relationships WHERE mentorship_id = $1 AND (mentor_id = $2 OR startup_id = $2)",
        [relationshipId, reviewerId]
      );
      if (!result.rows.length) {
        return res.status(403).json({ error: "User is not a participant in this relationship" });
      }
    }

    if (String(relationshipType).toLowerCase() === "investment") {
      const result = await pool.query(
        "SELECT 1 FROM investment_relationships WHERE investment_id = $1 AND (investor_id = $2 OR startup_id = $2)",
        [relationshipId, reviewerId]
      );
      if (!result.rows.length) {
        return res.status(403).json({ error: "User is not a participant in this relationship" });
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireCompletedSession(req, res, next) {
  try {
    const entityType = String(req.body.entity_type || req.body.entityType || "").toLowerCase();
    if (!["session", "meeting"].includes(entityType)) return next();

    const entityId = req.body.entity_id || req.body.entityId;
    const reviewerId = req.user.user_id;
    const result = await pool.query(
      `SELECT 1 FROM mentorship_sessions
       WHERE mentorship_session_id = $1
         AND status = 'completed'
         AND (host_id = $2 OR participant_id = $2)`,
      [entityId, reviewerId]
    );
    if (!result.rows.length) {
      return res.status(403).json({ error: "Completed session or meeting required for rating" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

async function preventDuplicateRatings(req, res, next) {
  try {
    const reviewerId = req.user.user_id;
    const entityType = req.body.entity_type || req.body.entityType;
    const entityId = req.body.entity_id || req.body.entityId;
    const result = await pool.query(
      "SELECT id FROM ratings WHERE reviewer_id = $1 AND entity_type = $2 AND entity_id = $3 AND status IN ('active','edited') LIMIT 1",
      [reviewerId, entityType, entityId]
    );
    if (result.rows.length) {
      return res.status(409).json({ error: "Duplicate rating not allowed" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

async function validateRatingPermission(req, res, next) {
  try {
    const allowed = await ratingService.canUserRate({
      reviewerId: req.user.user_id,
      reviewedUserId: req.body.reviewed_user_id,
      relationshipId: req.body.relationship_id,
      relationshipType: req.body.relationship_type,
      entityType: req.body.entity_type,
      entityId: req.body.entity_id,
    });
    if (!allowed) {
      return res.status(403).json({ error: "You are not allowed to rate this user or entity" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateRatingPayload,
  validateReportPayload,
  requireRelationshipParticipant,
  requireCompletedSession,
  preventDuplicateRatings,
  validateRatingPermission,
};
