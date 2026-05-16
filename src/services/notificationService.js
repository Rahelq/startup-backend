const pool = require("../config/db");
const notificationSocket = require("../socket/notificationSocket");

async function getUnreadCount(userId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = false",
    [userId]
  );
  return result.rows[0]?.unread || 0;
}

async function getGroupedNotifications(userId, limit = 10) {
  const result = await pool.query(
    `SELECT notification_type, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_read = false)::int AS unread,
      MAX(created_at) AS latest_at
     FROM notifications
     WHERE user_id = $1
     GROUP BY notification_type
     ORDER BY latest_at DESC NULLS LAST
     LIMIT $2`,
    [userId, Number(limit) || 10]
  );
  return result.rows;
}

async function getNotificationSummary(userId, { limit = 10 } = {}) {
  const [unreadCount, groupedNotifications, recentNotifications] = await Promise.all([
    getUnreadCount(userId),
    getGroupedNotifications(userId, limit),
    pool.query(
      `SELECT notification_id, notification_type, title, message, is_read, reference_type, reference_id, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, Number(limit) || 10]
    ),
  ]);

  return {
    unread_count: unreadCount,
    grouped_notifications: groupedNotifications,
    recent_notifications: recentNotifications.rows,
  };
}

async function createNotification({
  userId,
  notificationType,
  title,
  message,
  referenceType = null,
  referenceId = null,
  metadata = null,
}) {
  const result = await pool.query(
    `INSERT INTO notifications (
			user_id,
			notification_type,
			title,
			message,
			reference_type,
			reference_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *`,
    [userId, notificationType, title, message, referenceType, referenceId]
  );
  if (metadata && result.rows[0]) {
    result.rows[0].metadata = metadata;
  }

  if (result.rows[0]) {
    notificationSocket.emitNotificationCreated(Number(userId), result.rows[0]);
    notificationSocket.emitDashboardUpdated(Number(userId), {
      type: "notification",
      notification: result.rows[0],
    });
  }
  return result.rows[0];
}

module.exports = {
  createNotification,
  getUnreadCount,
  getGroupedNotifications,
  getNotificationSummary,
};
