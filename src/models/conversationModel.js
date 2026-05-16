const pool = require("../config/db");

// Create or get conversation between two users
exports.findOrCreateByParticipants = async (user1Id, user2Id, conversationType) => {
  const result = await pool.query(
    `SELECT * FROM conversations 
		 WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
		 ${conversationType ? "AND conversation_type = $3" : ""}
		 ORDER BY created_at DESC LIMIT 1`,
    conversationType ? [user1Id, user2Id, conversationType] : [user1Id, user2Id]
  );

  if (result.rowCount > 0) {
    return result.rows[0];
  }

  // Create new conversation
  const createResult = await pool.query(
    `INSERT INTO conversations (user1_id, user2_id, conversation_type)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
    [user1Id, user2Id, conversationType]
  );

  return createResult.rows[0];
};

// Get conversation by ID
exports.findById = async (conversationId) => {
  const result = await pool.query("SELECT * FROM conversations WHERE conversation_id = $1", [
    conversationId,
  ]);
  return result.rows[0] || null;
};

// Get all conversations for a user
exports.findByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM conversations 
		 WHERE user1_id = $1 OR user2_id = $1
		 ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
};

// Update conversation (mark as read, etc)
exports.update = async (conversationId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(conversationId);

  const result = await pool.query(
    `UPDATE conversations SET ${setClause} WHERE conversation_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};
