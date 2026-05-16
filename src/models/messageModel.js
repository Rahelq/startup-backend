const pool = require("../config/db");

// Create message
exports.create = async (messageData) => {
  const { conversationId, senderId, receiverId, message, messageType, attachmentPath } =
    messageData;

  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message, message_type, attachment_path)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
    [conversationId, senderId, receiverId, message, messageType, attachmentPath]
  );

  return result.rows[0];
};

// Get messages by conversation
exports.findByConversationId = async (conversationId, limit = 20, offset = 0) => {
  const result = await pool.query(
    `SELECT * FROM messages 
		 WHERE conversation_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );
  return result.rows;
};

// Mark messages as read
exports.markAsRead = async (conversationId, userId) => {
  const result = await pool.query(
    `UPDATE messages SET is_read = true, read_at = NOW()
		 WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false
		 RETURNING *`,
    [conversationId, userId]
  );
  return result.rows;
};

// Get unread count
exports.getUnreadCount = async (conversationId, userId) => {
  const result = await pool.query(
    `SELECT COUNT(*) as unread_count FROM messages 
		 WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false`,
    [conversationId, userId]
  );
  return parseInt(result.rows[0].unread_count, 10);
};

// Delete message
exports.deleteById = async (messageId) => {
  const result = await pool.query("DELETE FROM messages WHERE message_id = $1 RETURNING *", [
    messageId,
  ]);
  return result.rows[0] || null;
};
