const pool = require("../config/db");

// Create notification
exports.create = async (notificationData) => {
  const { userId, title, message, notificationType, relatedEntityId, relatedEntityType, isRead } =
    notificationData;

  const result = await pool.query(
    `INSERT INTO notifications (user_id, title, message, notification_type, related_entity_id, related_entity_type, is_read)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
    [userId, title, message, notificationType, relatedEntityId, relatedEntityType, isRead || false]
  );

  return result.rows[0];
};

// Get notification by ID
exports.findById = async (notificationId) => {
  const result = await pool.query("SELECT * FROM notifications WHERE notification_id = $1", [
    notificationId,
  ]);
  return result.rows[0] || null;
};

// Get all notifications for a user
exports.findByUserId = async (userId, limit = 50, offset = 0) => {
  const result = await pool.query(
    `SELECT * FROM notifications 
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

// Get unread notifications
exports.findUnreadByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM notifications 
		 WHERE user_id = $1 AND is_read = false
		 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Mark as read
exports.markAsRead = async (notificationId) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true, read_at = NOW() 
		 WHERE notification_id = $1
		 RETURNING *`,
    [notificationId]
  );
  return result.rows[0] || null;
};

// Mark all as read for user
exports.markAllAsReadByUserId = async (userId) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true, read_at = NOW() 
		 WHERE user_id = $1 AND is_read = false
		 RETURNING *`,
    [userId]
  );
  return result.rows;
};

// Delete notification
exports.deleteById = async (notificationId) => {
  const result = await pool.query(
    "DELETE FROM notifications WHERE notification_id = $1 RETURNING *",
    [notificationId]
  );
  return result.rows[0] || null;
};
