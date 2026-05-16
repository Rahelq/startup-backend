const pool = require("../config/db");

async function findById(projectId) {
	const res = await pool.query(
		`SELECT project_id, startup_id, project_title, description, funding_goal, amount_raised, status, start_date, end_date
     FROM projects WHERE project_id = $1`,
		[projectId],
	);
	return res.rows[0] || null;
}

async function findByStartupId(startupId) {
	const res = await pool.query(
		`SELECT project_id, startup_id, project_title, description, funding_goal, amount_raised, status, start_date, end_date
     FROM projects WHERE startup_id = $1`,
		[startupId],
	);
	return res.rows;
}

async function create({
	startupId,
	projectTitle,
	description,
	fundingGoal,
	status,
}) {
	const res = await pool.query(
		`INSERT INTO projects (startup_id, project_title, description, funding_goal, status, start_date)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING project_id, startup_id, project_title`,
		[startupId, projectTitle, description, fundingGoal, status || "active"],
	);
	return res.rows[0];
}

module.exports = { findById, findByStartupId, create };
