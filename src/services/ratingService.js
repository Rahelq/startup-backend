const ratingModel = require("../models/ratingModel");
const feedbackReportModel = require("../models/feedbackReportModel");
const pool = require("../config/db");
const activityService = require("./activityService");
const notificationService = require("./notificationService");
const reputationService = require("./reputationService");

async function isActiveUser(userId) {
  const result = await pool.query(
    "SELECT user_id, is_active, account_status, deleted_at FROM users WHERE user_id = $1",
    [userId]
  );
  const user = result.rows[0];
  return (
    !!user && user.is_active !== false && user.account_status !== "suspended" && !user.deleted_at
  );
}

async function hasMentorshipParticipation(relationshipId, userId) {
  const result = await pool.query(
    "SELECT 1 FROM mentorship_relationships WHERE mentorship_id = $1 AND (mentor_id = $2 OR startup_id = $2)",
    [relationshipId, userId]
  );
  return result.rows.length > 0;
}

async function hasInvestmentParticipation(relationshipId, userId) {
  const result = await pool.query(
    "SELECT 1 FROM investment_relationships WHERE investment_id = $1 AND (investor_id = $2 OR startup_id = $2)",
    [relationshipId, userId]
  );
  return result.rows.length > 0;
}

async function hasCompletedMentorshipSession(sessionId, userId) {
  const result = await pool.query(
    `SELECT 1 FROM mentorship_sessions
     WHERE mentorship_session_id = $1
       AND status = 'completed'
       AND (host_id = $2 OR participant_id = $2)`,
    [sessionId, userId]
  );
  return result.rows.length > 0;
}

async function hasCompletedVideoSession(sessionId, userId) {
  const result = await pool.query(
    `SELECT 1 FROM video_sessions
     WHERE (id = $1 OR video_session_id = $1 OR meeting_id = $1)
       AND status = 'completed'
       AND (host_id = $2 OR participant_id = $2)`,
    [sessionId, userId]
  );
  return result.rows.length > 0;
}

async function canUserRate({
  reviewerId,
  reviewedUserId,
  relationshipId,
  relationshipType,
  entityType,
  entityId,
}) {
  if (!reviewerId || !reviewedUserId) return false;
  if (Number(reviewerId) === Number(reviewedUserId)) return false;
  if (!(await isActiveUser(reviewerId))) return false;

  const normalizedEntityType = String(entityType || "").toLowerCase();
  const normalizedRelationshipType = String(relationshipType || "").toLowerCase();

  if (relationshipId && normalizedRelationshipType === "mentorship") {
    return hasMentorshipParticipation(relationshipId, reviewerId);
  }
  if (relationshipId && normalizedRelationshipType === "investment") {
    return hasInvestmentParticipation(relationshipId, reviewerId);
  }

  if (["session", "meeting"].includes(normalizedEntityType)) {
    return (
      hasCompletedMentorshipSession(entityId, reviewerId) ||
      hasCompletedVideoSession(entityId, reviewerId)
    );
  }

  if (["relationship"].includes(normalizedEntityType)) {
    return (
      hasMentorshipParticipation(relationshipId, reviewerId) ||
      hasInvestmentParticipation(relationshipId, reviewerId)
    );
  }

  if (["mentor", "startup", "investor", "project", "milestone"].includes(normalizedEntityType)) {
    const participation = await pool.query(
      `SELECT 1
       FROM interactions
       WHERE (user_id = $1 OR receiver_id = $1)
         AND category IN ('investment', 'mentorship')
       LIMIT 1`,
      [reviewerId]
    );
    return participation.rows.length > 0;
  }

  return false;
}

async function createRating(input) {
  const { reviewer_id, reviewed_user_id, entity_type, entity_id } = input;
  const allowed = await canUserRate({
    reviewerId: reviewer_id,
    reviewedUserId: reviewed_user_id,
    relationshipId: input.relationship_id,
    relationshipType: input.relationship_type,
    entityType: entity_type,
    entityId: entity_id,
  });
  if (!allowed) throw new Error("Permission denied to create rating");

  const existing = await pool.query(
    "SELECT * FROM ratings WHERE reviewer_id = $1 AND entity_type = $2 AND entity_id = $3 AND status IN ('active', 'edited')",
    [reviewer_id, entity_type, entity_id]
  );
  if (existing.rows.length) throw new Error("Duplicate rating not allowed");

  const r = await ratingModel.createRating({
    ...input,
    status: "active",
  });

  await activityService.recordActivity({
    userId: reviewer_id,
    activityType: "rating_created",
    entityType: entity_type,
    entityId: r.id,
  });

  await notificationService.createNotification({
    userId: reviewed_user_id,
    notificationType: "rating",
    title: "You received a rating",
    message: `You received a new rating of ${r.rating}`,
    referenceType: "rating",
    referenceId: r.id,
  });

  await reputationService.calculateReputationForUser(reviewed_user_id);
  return r;
}

async function listForEntity(entityType, entityId, { limit = 20, offset = 0 } = {}) {
  return ratingModel.findByEntity(entityType, entityId, { limit, offset });
}

async function listForUser(userId, { limit = 20, offset = 0 } = {}) {
  return ratingModel.findRecentForUser(userId, { limit, offset });
}

async function listForReviewer(reviewerId, { limit = 20, offset = 0 } = {}) {
  return ratingModel.findByReviewer(reviewerId, { limit, offset });
}

async function listModerationQueue({ limit = 50, offset = 0, status = null } = {}) {
  return ratingModel.listRatings({ limit, offset, status, entityType: null });
}

async function listReports({ limit = 50, offset = 0, status = null } = {}) {
  return feedbackReportModel.listReports({ limit, offset, status });
}

async function moderateRating({ ratingId, status, moderatorId, reason = null }) {
  const updated = await ratingModel.updateRating(ratingId, {
    status,
    moderated_by: moderatorId,
    moderation_reason: reason,
  });
  if (!updated) {
    throw new Error("Rating not found");
  }
  await activityService.recordActivity({
    userId: moderatorId,
    activityType:
      status === "hidden" || status === "removed" ? "review_reported" : "reputation_updated",
    entityType: "rating",
    entityId: ratingId,
    metadata: { status, reason },
  });
  return updated;
}

async function moderateReport({ reportId, status, moderatorId }) {
  const updated = await feedbackReportModel.updateReport(reportId, {
    status,
    reviewed_by: moderatorId,
    reviewed_at: new Date().toISOString(),
  });
  if (!updated) {
    throw new Error("Report not found");
  }
  return updated;
}

async function banReviewer({ userId, moderatorId, reason = null }) {
  const result = await pool.query(
    `UPDATE users
     SET is_active = false,
         account_status = 'suspended',
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, email, is_active, account_status`,
    [userId]
  );
  if (!result.rows[0]) throw new Error("Reviewer not found");

  await activityService.recordActivity({
    userId: moderatorId,
    activityType: "reputation_updated",
    entityType: "user",
    entityId: userId,
    metadata: { action: "ban_reviewer", reason },
  });
  return result.rows[0];
}

module.exports = {
  createRating,
  listForEntity,
  listForUser,
  listForReviewer,
  listModerationQueue,
  listReports,
  moderateRating,
  moderateReport,
  banReviewer,
  canUserRate,
};
