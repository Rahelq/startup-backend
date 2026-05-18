const pool = require("../config/db");
const feedbackModel = require("../models/feedbackReportModel");
const activityService = require("./activityService");
const notificationService = require("./notificationService");

async function notifyAdmins(notificationType, title, message, referenceType, referenceId) {
  const admins = await pool.query(
    "SELECT user_id FROM users WHERE role = 'Admin' AND is_active = true"
  );
  await Promise.all(
    admins.rows.map((admin) =>
      notificationService.createNotification({
        userId: admin.user_id,
        notificationType,
        title,
        message,
        referenceType,
        referenceId,
      })
    )
  );
}

async function reportRating({ rating_id, reported_by, reason, description }) {
  // ensure rating exists
  const rv = await pool.query("SELECT id FROM ratings WHERE id = $1", [rating_id]);
  if (!rv.rowCount) {
    const err = new Error("Rating not found");
    err.status = 404;
    throw err;
  }
  const rpt = await feedbackModel.createReport({ rating_id, reported_by, reason, description });
  await activityService.recordActivity({
    userId: reported_by,
    activityType: "review_reported",
    entityType: "rating",
    entityId: rating_id,
  });
  await notifyAdmins(
    "report",
    "Rating reported",
    `Rating ${rating_id} reported`,
    "rating",
    rating_id
  );
  return rpt;
}

async function resolveReport(reportId, status, moderatorId) {
  const updated = await feedbackModel.updateReport(reportId, {
    status,
    reviewed_by: moderatorId,
    reviewed_at: new Date().toISOString(),
  });
  if (!updated) throw new Error("Report not found");
  return updated;
}

module.exports = { reportRating, resolveReport, notifyAdmins };
