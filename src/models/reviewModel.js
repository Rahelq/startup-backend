const pool = require("../config/db");

// Create review
exports.create = async (reviewData) => {
  const { mentorId, startupId, rating, comment, reviewType } = reviewData;

  const result = await pool.query(
    `INSERT INTO reviews (mentor_id, startup_id, rating, comment, review_type)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING *`,
    [mentorId, startupId, rating, comment, reviewType]
  );

  return result.rows[0];
};

// Get review by ID
exports.findById = async (reviewId) => {
  const result = await pool.query("SELECT * FROM reviews WHERE review_id = $1", [reviewId]);
  return result.rows[0] || null;
};

// Get all reviews for a mentor
exports.findByMentorId = async (mentorId) => {
  const result = await pool.query(
    `SELECT * FROM reviews 
		 WHERE mentor_id = $1
		 ORDER BY created_at DESC`,
    [mentorId]
  );
  return result.rows;
};

// Get all reviews from a startup
exports.findByStartupId = async (startupId) => {
  const result = await pool.query(
    `SELECT * FROM reviews 
		 WHERE startup_id = $1
		 ORDER BY created_at DESC`,
    [startupId]
  );
  return result.rows;
};

// Update review
exports.update = async (reviewId, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) {
    return null;
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  values.push(reviewId);

  const result = await pool.query(
    `UPDATE reviews SET ${setClause} WHERE review_id = $${fields.length + 1}
		 RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete review
exports.deleteById = async (reviewId) => {
  const result = await pool.query("DELETE FROM reviews WHERE review_id = $1 RETURNING *", [
    reviewId,
  ]);
  return result.rows[0] || null;
};
