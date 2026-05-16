const pool = require("../config/db");

async function findByEmail(email) {
	const res = await pool.query(
		"SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL",
		[email],
	);
	return res.rows[0] || null;
}

async function findById(userId) {
	const res = await pool.query(
		`SELECT user_id, first_name, last_name, email, role, phone_number,
        is_active, is_approved, approved_by, approved_at, created_at,
        verification_status, account_status, deleted_at
     FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
		[userId],
	);
	return res.rows[0] || null;
}

/** Admin / internal: includes soft-deleted rows when needed */
async function findByIdAdmin(userId) {
	const res = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
	return res.rows[0] || null;
}

async function createUser({ firstName, lastName, email, passwordHash, role }) {
	const res = await pool.query(
		`INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING user_id, first_name, last_name, email, role, is_approved`,
		[firstName, lastName, email, passwordHash, role],
	);
	return res.rows[0];
}

async function findByPasswordResetToken(token) {
	const res = await pool.query(
		`SELECT * FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND deleted_at IS NULL`,
		[token],
	);
	return res.rows[0] || null;
}

async function setPasswordResetToken(userId, token, expiresAt) {
	await pool.query(
		`UPDATE users
     SET password_reset_token = $2, password_reset_expires = $3, updated_at = NOW()
     WHERE user_id = $1`,
		[userId, token, expiresAt],
	);
}

async function clearPasswordResetToken(userId) {
	await pool.query(
		`UPDATE users
     SET password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
     WHERE user_id = $1`,
		[userId],
	);
}

async function updatePasswordHash(userId, passwordHash) {
	await pool.query(
		"UPDATE users SET password_hash = $2, updated_at = NOW() WHERE user_id = $1",
		[userId, passwordHash],
	);
}

module.exports = {
	findByEmail,
	findById,
	findByIdAdmin,
	createUser,
	findByPasswordResetToken,
	setPasswordResetToken,
	clearPasswordResetToken,
	updatePasswordHash,
};
