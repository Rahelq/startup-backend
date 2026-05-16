const pool = require("../config/db");

exports.recordActivity = async ({ userId, projectId, action, metadata }) => {
  if (!projectId) throw Object.assign(new Error("project_id is required"), { status: 400 });
  if (!action) throw Object.assign(new Error("action is required"), { status: 400 });

  const p = await pool.query(
    `SELECT p.project_id, s.user_id AS owner_user_id FROM projects p JOIN startups s ON s.startup_id = p.startup_id WHERE p.project_id = $1`,
    [projectId]
  );
  if (!p.rowCount) throw Object.assign(new Error("Project not found"), { status: 404 });
  const proj = p.rows[0];
  if (proj.owner_user_id !== userId)
    throw Object.assign(new Error("Not project owner"), { status: 403 });

  const res = await pool.query(
    `INSERT INTO project_activity_logs (project_id, actor_user_id, action, metadata) VALUES ($1,$2,$3,$4) RETURNING *`,
    [projectId, userId, action, metadata ? JSON.stringify(metadata) : null]
  );
  return res.rows[0];
};

exports.listActivity = async ({ userId, projectId }) => {
  if (!projectId) throw Object.assign(new Error("project_id is required"), { status: 400 });
  const p = await pool.query(
    `SELECT p.project_id, s.user_id AS owner_user_id FROM projects p JOIN startups s ON s.startup_id = p.startup_id WHERE p.project_id = $1`,
    [projectId]
  );
  if (!p.rowCount) throw Object.assign(new Error("Project not found"), { status: 404 });
  const proj = p.rows[0];
  if (proj.owner_user_id !== userId)
    throw Object.assign(new Error("Not project owner"), { status: 403 });

  const q = await pool.query(
    `SELECT * FROM project_activity_logs WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );
  return q.rows;
};
