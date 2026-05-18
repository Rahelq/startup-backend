const pool = require("../config/db");
const documentUploadService = require("../services/documentUploadService");

function parsePositiveNumber(value, fieldName, { allowZero = false } = {}) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    const message = allowZero
      ? `${fieldName} must be a non-negative number`
      : `${fieldName} must be a positive number`;
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
  return parsed;
}

async function getStartupIdForUser(userId) {
  const startupResult = await pool.query("SELECT startup_id FROM startups WHERE user_id = $1", [
    userId,
  ]);
  return startupResult.rowCount ? startupResult.rows[0].startup_id : null;
}

async function getOwnedProject(projectId, userId) {
  const startupId = await getStartupIdForUser(userId);
  if (!startupId) return null;

  const projectResult = await pool.query(
    "SELECT * FROM projects WHERE project_id = $1 AND startup_id = $2",
    [projectId, startupId]
  );

  return projectResult.rowCount ? projectResult.rows[0] : null;
}

function parseProjectId(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: "Invalid project id" });
    return null;
  }
  return projectId;
}

exports.createProject = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const startup_id = await getStartupIdForUser(userId);

    if (!startup_id) {
      return res.status(404).send("Startup profile not found");
    }

    let { project_title, description, funding_goal, start_date, end_date, status } = req.body;

    if (!project_title || typeof project_title !== "string") {
      return res.status(400).json({ error: "project_title is required" });
    }

    funding_goal = parsePositiveNumber(funding_goal, "funding_goal", {
      allowZero: false,
    });

    const allowedStatuses = ["draft", "active"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "status must be draft or active" });
    }

    const result = await pool.query(
      `
INSERT INTO projects(
 startup_id,
 project_title,
 description,
 funding_goal,
 status,
 start_date,
 end_date
)
VALUES($1,$2,$3,$4,$5,$6,$7)
RETURNING *
`,
      [
        startup_id,
        project_title.trim(),
        description,
        funding_goal,
        status || "active",
        start_date,
        end_date,
      ]
    );

    res.json({
      message: "Project created successfully",
      project: result.rows[0],
    });
    // handle uploaded files (persist to documents and link to project)
    if (req.files && Array.isArray(req.files) && req.files.length) {
      const projectId = result.rows[0].project_id;
      for (const file of req.files) {
        try {
          const saved = await documentUploadService.saveUploadedFile(file, {
            userId,
            startupId: startup_id,
            documentType: req.body?.document_type || "project_document",
            contextType: "project",
            contextId: projectId,
            description: file.originalname,
          });

          await pool.query(
            `INSERT INTO project_documents (project_id, document_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [projectId, saved.document_id || saved.documentId || saved.document_id]
          );
        } catch (err) {
          // non-fatal; continue with other files
        }
      }
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    const startupId = await getStartupIdForUser(req.user.user_id);
    if (!startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    const result = await pool.query(
      `SELECT *
       FROM projects
       WHERE startup_id = $1
       ORDER BY created_at DESC`,
      [startupId]
    );

    return res.json({ projects: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const result = await pool.query(
      `SELECT
        p.*,
        s.startup_id,
        s.startup_name,
        s.industry,
        s.description AS startup_description,
        s.business_stage,
        s.location,
        s.website,
        u.user_id AS startup_user_id,
        u.first_name AS founder_first_name,
        u.last_name AS founder_last_name,
        u.email AS founder_email
       FROM projects p
       JOIN startups s ON s.startup_id = p.startup_id
       JOIN users u ON u.user_id = s.user_id
       WHERE p.project_id = $1
         AND p.status <> 'cancelled'
         AND u.is_active = true
         AND u.is_approved = true`,
      [projectId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Project not found" });
    }

    const docs = await pool.query(
      `SELECT d.document_id, d.file_name, d.file_path, d.file_type, d.file_size_bytes, d.description, d.created_at
       FROM documents d
       LEFT JOIN project_documents pd ON pd.document_id = d.document_id
       WHERE d.startup_id = $1
         AND (pd.project_id = $2 OR pd.project_id IS NULL)
       ORDER BY created_at DESC`,
      [result.rows[0].startup_id, projectId]
    );

    const milestones = await pool.query(
      `SELECT milestone_id, milestone_title, description, target_date, completed_at,
              deliverables, success_criteria, estimated_cost, status, created_at, updated_at
       FROM project_milestones
       WHERE project_id = $1
       ORDER BY target_date ASC NULLS LAST, created_at ASC`,
      [projectId]
    );

    const project = result.rows[0];
    project.documents = docs.rows;
    project.milestones = milestones.rows;
    return res.json({ project });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateMyProject = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const startupId = await getStartupIdForUser(req.user.user_id);
    if (!startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    let { project_title, description, funding_goal, amount_raised, status, start_date, end_date } =
      req.body || {};

    const allowedStatuses = ["draft", "active", "funded", "completed", "cancelled"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "status must be one of draft, active, funded, completed, cancelled",
      });
    }

    if (funding_goal !== undefined && funding_goal !== null && funding_goal !== "") {
      funding_goal = parsePositiveNumber(funding_goal, "funding_goal");
    } else {
      funding_goal = null;
    }

    if (amount_raised !== undefined && amount_raised !== null && amount_raised !== "") {
      amount_raised = parsePositiveNumber(amount_raised, "amount_raised", {
        allowZero: true,
      });
    } else {
      amount_raised = null;
    }

    const updated = await pool.query(
      `UPDATE projects
       SET project_title = COALESCE($1, project_title),
           description = COALESCE($2, description),
           funding_goal = COALESCE($3, funding_goal),
           amount_raised = COALESCE($4, amount_raised),
           status = COALESCE($5, status),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date)
       WHERE project_id = $8 AND startup_id = $9
       RETURNING *`,
      [
        project_title ? project_title.trim() : null,
        description,
        funding_goal,
        amount_raised,
        status,
        start_date,
        end_date,
        projectId,
        startupId,
      ]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json({ message: "Project updated", project: updated.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.uploadProjectDocument = async (req, res) => {
  try {
    const projectId = parseProjectId(req, res);
    if (!projectId) return;

    const project = await getOwnedProject(projectId, req.user.user_id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!req.file) return res.status(400).json({ error: "file is required" });

    const description = req.body?.description || req.body?.document_type || null;

    // Use documentUploadService to upload buffer to Cloudinary and persist metadata
    const saved = await documentUploadService.saveUploadedFile(req.file, {
      userId: req.user.user_id,
      startupId: project.startup_id,
      documentType: req.body?.document_type || "project_document",
      contextType: "project",
      contextId: projectId,
      description,
    });

    await pool.query(
      `INSERT INTO project_documents (project_id, document_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
      [projectId, saved.document_id || saved.documentId || saved.document_id]
    );

    return res.status(201).json({ message: "Project document uploaded", document: saved });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.listProjectDocuments = async (req, res) => {
  try {
    const projectId = parseProjectId(req, res);
    if (!projectId) return;

    const project = await pool.query(
      `SELECT p.project_id
			 FROM projects p
			 JOIN startups s ON s.startup_id = p.startup_id
			 JOIN users u ON u.user_id = s.user_id
			 WHERE p.project_id = $1
			   AND p.status <> 'cancelled'
			   AND u.is_active = true
			   AND u.is_approved = true`,
      [projectId]
    );

    if (!project.rowCount) {
      return res.status(404).json({ error: "Project not found" });
    }

    const documents = await pool.query(
      `SELECT d.document_id,
			        d.file_name,
			        COALESCE(d.file_url, d.file_path) AS file_url,
			        COALESCE(d.mime_type, d.file_type) AS file_type,
			        d.file_size_bytes,
			        d.description,
			        d.created_at
			 FROM documents d
			 JOIN project_documents pd ON pd.document_id = d.document_id
			 WHERE pd.project_id = $1
			 ORDER BY d.created_at DESC`,
      [projectId]
    );

    return res.json({ documents: documents.rows });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.createProjectMilestone = async (req, res) => {
  try {
    const projectId = parseProjectId(req, res);
    if (!projectId) return;

    const project = await getOwnedProject(projectId, req.user.user_id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const {
      milestone_title,
      description,
      target_date,
      deliverables,
      success_criteria,
      estimated_cost,
    } = req.body || {};

    if (!milestone_title || typeof milestone_title !== "string") {
      return res.status(400).json({ error: "milestone_title is required" });
    }

    const cost =
      estimated_cost !== undefined && estimated_cost !== null && estimated_cost !== ""
        ? parsePositiveNumber(estimated_cost, "estimated_cost", { allowZero: true })
        : null;

    const milestone = await pool.query(
      `INSERT INTO project_milestones (
				project_id, milestone_title, description, target_date,
				deliverables, success_criteria, estimated_cost
			 )
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING *`,
      [
        projectId,
        milestone_title.trim(),
        description || null,
        target_date || null,
        deliverables || null,
        success_criteria || null,
        cost,
      ]
    );

    return res.status(201).json({
      message: "Project milestone created",
      milestone: milestone.rows[0],
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.listProjectMilestones = async (req, res) => {
  try {
    const projectId = parseProjectId(req, res);
    if (!projectId) return;

    const project = await pool.query(
      "SELECT project_id FROM projects WHERE project_id = $1 AND status <> 'cancelled'",
      [projectId]
    );
    if (!project.rowCount) {
      return res.status(404).json({ error: "Project not found" });
    }

    const milestones = await pool.query(
      `SELECT *
			 FROM project_milestones
			 WHERE project_id = $1
			 ORDER BY target_date ASC NULLS LAST, created_at ASC`,
      [projectId]
    );

    return res.json({ milestones: milestones.rows });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateProjectMilestone = async (req, res) => {
  try {
    const milestoneId = Number(req.params.milestoneId);
    if (!Number.isInteger(milestoneId) || milestoneId <= 0) {
      return res.status(400).json({ error: "Invalid milestone id" });
    }

    const {
      milestone_title,
      description,
      target_date,
      deliverables,
      success_criteria,
      estimated_cost,
      status,
    } = req.body || {};

    const allowedStatuses = ["pending", "in_progress", "completed", "blocked", "cancelled"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "status must be one of pending, in_progress, completed, blocked, cancelled",
      });
    }

    const cost =
      estimated_cost !== undefined && estimated_cost !== null && estimated_cost !== ""
        ? parsePositiveNumber(estimated_cost, "estimated_cost", { allowZero: true })
        : null;

    const startupId = await getStartupIdForUser(req.user.user_id);
    if (!startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    const updated = await pool.query(
      `UPDATE project_milestones pm
			 SET milestone_title = COALESCE($1, pm.milestone_title),
			     description = COALESCE($2, pm.description),
			     target_date = COALESCE($3, pm.target_date),
			     deliverables = COALESCE($4, pm.deliverables),
			     success_criteria = COALESCE($5, pm.success_criteria),
			     estimated_cost = COALESCE($6, pm.estimated_cost),
			     status = COALESCE($7, pm.status),
			     completed_at = CASE
			       WHEN $7 = 'completed' AND pm.completed_at IS NULL THEN NOW()
			       WHEN $7 IS NOT NULL AND $7 <> 'completed' THEN NULL
			       ELSE pm.completed_at
			     END,
			     updated_at = NOW()
			 FROM projects p
			 WHERE p.project_id = pm.project_id
			   AND p.startup_id = $8
			   AND pm.milestone_id = $9
			 RETURNING pm.*`,
      [
        milestone_title ? milestone_title.trim() : null,
        description,
        target_date,
        deliverables,
        success_criteria,
        cost,
        status,
        startupId,
        milestoneId,
      ]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    return res.json({
      message: "Project milestone updated",
      milestone: updated.rows[0],
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

// Get all discoverable projects
exports.getAllProjects = async (req, res) => {
  try {
    const { q, industry, stage, status = "active", limit = 100, offset = 0 } = req.query || {};
    const filters = ["u.is_active = true", "u.is_approved = true"];
    const values = [];

    if (status) {
      values.push(status);
      filters.push(`p.status = $${values.length}`);
    }

    if (industry) {
      values.push(`%${industry}%`);
      filters.push(`s.industry ILIKE $${values.length}`);
    }

    if (stage) {
      values.push(`%${stage}%`);
      filters.push(`s.business_stage ILIKE $${values.length}`);
    }

    if (q) {
      values.push(`%${q}%`);
      filters.push(
        `(p.project_title ILIKE $${values.length} OR p.description ILIKE $${values.length} OR s.startup_name ILIKE $${values.length})`
      );
    }

    values.push(Number(limit) || 100);
    values.push(Number(offset) || 0);

    const result = await pool.query(
      `
SELECT
p.project_id,
p.project_title,
p.description,
p.funding_goal,
p.amount_raised,
p.status,
p.start_date,
p.end_date,
p.created_at,
s.startup_id,
s.startup_name,
s.industry,
s.business_stage,
s.location
FROM projects p
JOIN startups s
ON p.startup_id = s.startup_id
JOIN users u ON u.user_id = s.user_id
WHERE ${filters.join(" AND ")}
ORDER BY p.created_at DESC
LIMIT $${values.length - 1} OFFSET $${values.length}
`,
      values
    );

    res.json({ projects: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
