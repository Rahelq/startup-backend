const pool = require("../config/db");
const { ratingSchema, reportSchema } = require("../validations/rating");
const ratingService = require("../services/ratingService");

function validateRatingPayload(req, res, next) {
  const { error, value } = ratingSchema.validate(req.body || {});
  if (error) return res.status(400).json({ error: error.message });
  req.body = value;
  next();
}

function validateReportPayload(req, res, next) {
  const { error, value } = reportSchema.validate(req.body || {});
  if (error) return res.status(400).json({ error: error.message });
  req.body = value;
  next();
}

async function requireRelationshipParticipant(req, res, next) {
  try {
    const body = req.body || {};
    const relationshipId = body.relationship_id || body.relationshipId;
    const relationshipType = body.relationship_type || body.relationshipType;
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
    const body = req.body || {};
    const entityType = String(body.entity_type || body.entityType || "").toLowerCase();
    if (!["session", "meeting"].includes(entityType)) return next();

    const entityId = body.entity_id || body.entityId;
    const reviewerId = req.user.user_id;
    const result = await pool.query(
      `SELECT 1 FROM mentorship_sessions
       WHERE mentorship_session_id = $1
         AND status = 'completed'
         AND (
           mentor_id IN (SELECT mentor_id FROM mentors WHERE user_id = $2)
           OR startup_id IN (SELECT startup_id FROM startups WHERE user_id = $2)
         )`,
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
    const body = req.body || {};
    const reviewerId = req.user.user_id;
    const entityType = body.entity_type || body.entityType;
    const entityId = body.entity_id || body.entityId;
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
    const body = req.body || {};
    const allowed = await ratingService.canUserRate({
      reviewerId: req.user.user_id,
      reviewedUserId: body.reviewed_user_id,
      relationshipId: body.relationship_id,
      relationshipType: body.relationship_type,
      entityType: body.entity_type,
      entityId: body.entity_id,
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
