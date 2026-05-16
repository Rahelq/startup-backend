const pool = require("../config/db");

// Create interaction
exports.create = async (interactionData) => {
  const { userId, interactionType, entityType, entityId, metadata, description } = interactionData;

  const result = await pool.query(
    `INSERT INTO interactions (user_id, interaction_type, entity_type, entity_id, metadata, description)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
    [userId, interactionType, entityType, entityId, metadata, description]
  );

  return result.rows[0];
};

// Get interaction by ID
exports.findById = async (interactionId) => {
  const result = await pool.query("SELECT * FROM interactions WHERE interaction_id = $1", [
    interactionId,
  ]);
  return result.rows[0] || null;
};

// Get all interactions for a user
exports.findByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM interactions 
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Get all interactions for an entity
exports.findByEntity = async (entityType, entityId) => {
  const result = await pool.query(
    `SELECT * FROM interactions 
		 WHERE entity_type = $1 AND entity_id = $2
		 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
};

// Update interaction
exports.update = async (interactionId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(interactionId);

  const result = await pool.query(
    `UPDATE interactions SET ${setClause} WHERE interaction_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete interaction
exports.deleteById = async (interactionId) => {
  const result = await pool.query(
    "DELETE FROM interactions WHERE interaction_id = $1 RETURNING *",
    [interactionId]
  );
  return result.rows[0] || null;
};
