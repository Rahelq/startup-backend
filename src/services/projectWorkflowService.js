const pool = require("../config/db");
const realtimeEmitter = require("../utils/realtimeEmitter");

async function getStartupByUserId(userId) {
  const result = await pool.query(
    "SELECT startup_id, startup_name FROM startups WHERE user_id = $1",
    [userId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function getProjectWithContext(projectId) {
  const result = await pool.query(
    `SELECT
			p.*,
			u.user_id,
			u.first_name,
			u.last_name,
			u.email,
			s.startup_id,
			s.startup_name,
			(SELECT COUNT(*)
			 FROM investment_requests ir
			 WHERE ir.project_id = p.project_id
			   AND ir.status IN ('approved', 'pending'))::int AS active_investors,
			(SELECT COALESCE(SUM(inv.amount), 0)
			 FROM investments inv
			 JOIN investment_requests ir ON ir.investment_request_id = inv.investment_request_id
			 WHERE ir.project_id = p.project_id
			   AND inv.status = 'completed') AS total_funded,
			(SELECT COUNT(*) FROM project_milestones WHERE project_id = p.project_id)::int AS total_milestones
		 FROM projects p
		 JOIN startups s ON s.startup_id = p.startup_id
		 JOIN users u ON u.user_id = s.user_id
		 WHERE p.project_id = $1`,
    [projectId]
  );
  return result.rowCount ? result.rows[0] : null;
}

function asPositiveNumber(value, fieldName, { allowZero = false } = {}) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    const err = new Error(
      allowZero
        ? `${fieldName} must be a non-negative number`
        : `${fieldName} must be a positive number`
    );
    err.status = 400;
    throw err;
  }
  return parsed;
}

async function logAudit(actorUserId, action, entityType, entityId, metadata) {
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
		 VALUES ($1, $2, $3, $4, $5)`,
    [actorUserId, action, entityType, entityId || null, metadata || null]
  );
}

exports.createProject = async ({ userId, body }) => {
  const startup = await getStartupByUserId(userId);
  if (!startup) {
    const err = new Error("Startup profile not found");
    err.status = 404;
    throw err;
  }

  const { project_name, project_title, description, funding_goal, status, start_date, end_date } =
    body || {};

  const title = (project_title || project_name || "").trim();
  if (!title) {
    const err = new Error("project_title is required");
    err.status = 400;
    throw err;
  }

  const allowedStatuses = ["draft", "active"];
  if (status && !allowedStatuses.includes(status)) {
    const err = new Error("status must be draft or active");
    err.status = 400;
    throw err;
  }

  const fundingGoal = asPositiveNumber(funding_goal, "funding_goal");
  const projectRes = await pool.query(
    `INSERT INTO projects (
			startup_id, project_title, description, funding_goal, status, start_date, end_date
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
    [
      startup.startup_id,
      title,
      description || null,
      fundingGoal,
      status || "active",
      start_date || null,
      end_date || null,
    ]
  );

  await logAudit(userId, "project_created", "projects", projectRes.rows[0].project_id, {
    project_title: title,
    funding_goal: fundingGoal,
  });

  return {
    status: 201,
    data: {
      message: "Project created",
      project: projectRes.rows[0],
    },
  };
};

exports.getProject = async ({ projectId }) => {
  const project = await getProjectWithContext(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  return {
    status: 200,
    data: { project },
  };
};

exports.createMilestone = async ({ userId, projectId, body }) => {
  const project = await getProjectWithContext(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }
  if (project.user_id !== userId) {
    const err = new Error("Only project owner can create milestones");
    err.status = 403;
    throw err;
  }

  const {
    milestone_title,
    description,
    target_date,
    deliverables,
    success_criteria,
    estimated_cost,
  } = body || {};

  if (!milestone_title || typeof milestone_title !== "string") {
    const err = new Error("milestone_title is required");
    err.status = 400;
    throw err;
  }

  const cost =
    estimated_cost !== undefined && estimated_cost !== null && estimated_cost !== ""
      ? asPositiveNumber(estimated_cost, "estimated_cost", { allowZero: true })
      : null;

  const milestoneRes = await pool.query(
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

  await logAudit(
    userId,
    "milestone_created",
    "project_milestones",
    milestoneRes.rows[0].milestone_id,
    {
      project_id: project.project_id,
    }
  );

  return {
    status: 201,
    data: {
      message: "Milestone created",
      milestone: milestoneRes.rows[0],
    },
  };
};

exports.updateMilestoneStatus = async ({ userId, milestoneId, body }) => {
  const { status, progress_notes, completion_date } = body || {};
  const validStatuses = ["pending", "in_progress", "completed", "blocked", "cancelled"];
  if (!validStatuses.includes(status)) {
    const err = new Error(`status must be one of: ${validStatuses.join(", ")}`);
    err.status = 400;
    throw err;
  }

  const milestoneRes = await pool.query(
    `SELECT pm.*, p.project_id, s.user_id AS owner_user_id
		 FROM project_milestones pm
		 JOIN projects p ON p.project_id = pm.project_id
		 JOIN startups s ON s.startup_id = p.startup_id
		 WHERE pm.milestone_id = $1`,
    [milestoneId]
  );

  if (!milestoneRes.rowCount) {
    const err = new Error("Milestone not found");
    err.status = 404;
    throw err;
  }

  const milestone = milestoneRes.rows[0];
  if (milestone.owner_user_id !== userId) {
    const err = new Error("Only project owner can update milestones");
    err.status = 403;
    throw err;
  }

  const updateRes = await pool.query(
    `UPDATE project_milestones
		 SET status = $1,
		     progress_notes = $2,
		     completion_date = $3,
		     completed_at = CASE
		       WHEN $1 = 'completed' AND completed_at IS NULL THEN NOW()
		       WHEN $1 <> 'completed' THEN NULL
		       ELSE completed_at
		     END,
		     updated_at = NOW()
		 WHERE milestone_id = $4
		 RETURNING *`,
    [status, progress_notes || null, completion_date || null, milestoneId]
  );

  await logAudit(userId, "milestone_updated", "project_milestones", milestoneId, {
    project_id: milestone.project_id,
    new_status: status,
    previous_status: milestone.status,
  });

  const investorUsersRes = await pool.query(
    `SELECT DISTINCT i.user_id
		 FROM investment_requests ir
		 JOIN investors i ON i.investor_id = ir.investor_id
		 WHERE ir.project_id = $1
		   AND ir.status IN ('approved', 'pending')`,
    [milestone.project_id]
  );

  const recipientUserIds = [
    ...new Set([milestone.owner_user_id, ...investorUsersRes.rows.map((row) => row.user_id)]),
  ].filter(Boolean);

  realtimeEmitter.emitMilestoneUpdated(milestone.project_id, milestoneId, status, recipientUserIds);

  return {
    status: 200,
    data: {
      message: "Milestone updated",
      milestone: updateRes.rows[0],
    },
  };
};

exports.uploadProjectDocument = async ({ userId, projectId, body }) => {
  const { document_name, document_type, file_url } = body || {};
  const project = await getProjectWithContext(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }
  if (project.user_id !== userId) {
    const err = new Error("Only project owner can upload documents");
    err.status = 403;
    throw err;
  }
  if (!document_name || !file_url) {
    const err = new Error("document_name and file_url are required");
    err.status = 400;
    throw err;
  }

  const docRes = await pool.query(
    `INSERT INTO documents (
        user_id, startup_id, file_name, file_path, file_type, description,
        file_url, original_name, mime_type, document_type, context_type, context_id
      )
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING document_id, file_name, file_path, file_type, description, file_url, created_at`,
    [
      project.user_id,
      project.startup_id,
      document_name,
      file_url,
      document_type || null,
      document_type || null,
      file_url,
      document_name,
      document_type || null,
      document_type || "project_document",
      "project",
      projectId,
    ]
  );

  await pool.query(
    `INSERT INTO project_documents (project_id, document_id)
		 VALUES ($1, $2)
		 ON CONFLICT DO NOTHING`,
    [projectId, docRes.rows[0].document_id]
  );

  await logAudit(userId, "project_document_uploaded", "documents", docRes.rows[0].document_id, {
    project_id: projectId,
  });

  return {
    status: 201,
    data: {
      message: "Document uploaded",
      document: docRes.rows[0],
    },
  };
};

exports.getProjectDocuments = async ({ projectId }) => {
  const docs = await pool.query(
    `SELECT d.* FROM documents d
		 JOIN project_documents pd ON pd.document_id = d.document_id
		 WHERE pd.project_id = $1
		 ORDER BY d.created_at DESC`,
    [projectId]
  );

  return {
    status: 200,
    data: {
      project_id: projectId,
      documents: docs.rows,
      total_count: docs.rowCount,
    },
  };
};

exports.updateProjectStatus = async ({ userId, role, projectId, body }) => {
  const { status } = body || {};
  const project = await getProjectWithContext(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }
  if (project.user_id !== userId && role !== "Admin") {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const validStatuses = ["draft", "active", "funded", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    const err = new Error(`status must be one of: ${validStatuses.join(", ")}`);
    err.status = 400;
    throw err;
  }

  const updateRes = await pool.query(
    `UPDATE projects
		 SET status = $1
		 WHERE project_id = $2
		 RETURNING *`,
    [status, projectId]
  );

  await logAudit(userId, "project_status_updated", "projects", projectId, {
    new_status: status,
    previous_status: project.status,
  });

  return {
    status: 200,
    data: {
      message: "Project status updated",
      project: updateRes.rows[0],
    },
  };
};

exports.getStartupProjects = async ({ userId }) => {
  const startup = await getStartupByUserId(userId);
  if (!startup) {
    const err = new Error("Startup profile not found");
    err.status = 404;
    throw err;
  }

  const projects = await pool.query(
    `SELECT
			p.*,
			(SELECT COUNT(*) FROM investment_requests ir WHERE ir.project_id = p.project_id AND ir.status IN ('approved', 'pending'))::int AS active_investors,
			(SELECT COALESCE(SUM(inv.amount), 0)
			 FROM investments inv
			 JOIN investment_requests ir ON ir.investment_request_id = inv.investment_request_id
			 WHERE ir.project_id = p.project_id AND inv.status = 'completed') AS total_funded,
			(SELECT COUNT(*) FROM project_milestones WHERE project_id = p.project_id)::int AS total_milestones,
			(SELECT COUNT(*) FROM project_milestones WHERE project_id = p.project_id AND status = 'completed')::int AS completed_milestones
		 FROM projects p
		 WHERE p.startup_id = $1
		 ORDER BY p.created_at DESC`,
    [startup.startup_id]
  );

  return {
    status: 200,
    data: {
      projects: projects.rows,
      summary: {
        total_projects: projects.rowCount,
        active_projects: projects.rows.filter((p) => p.status === "active").length,
        total_funding_raised: projects.rows.reduce(
          (sum, p) => sum + Number(p.total_funded || 0),
          0
        ),
      },
    },
  };
};

exports.getAllProjects = async ({ query }) => {
  const { status, limit = 50, offset = 0 } = query || {};
  const params = [];
  let where = "WHERE 1=1";
  if (status) {
    params.push(status);
    where += ` AND p.status = $${params.length}`;
  }

  params.push(Number(limit) || 50, Number(offset) || 0);
  const result = await pool.query(
    `SELECT p.*, u.first_name, u.last_name, s.startup_name
		 FROM projects p
		 JOIN startups s ON s.startup_id = p.startup_id
		 JOIN users u ON u.user_id = s.user_id
		 ${where}
		 ORDER BY p.created_at DESC
		 LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    status: 200,
    data: {
      projects: result.rows,
      total_count: result.rowCount,
    },
  };
};

exports.getProjectMilestones = async ({ projectId }) => {
  const milestones = await pool.query(
    `SELECT *
		 FROM project_milestones
		 WHERE project_id = $1
		 ORDER BY target_date ASC NULLS LAST, created_at ASC`,
    [projectId]
  );

  return {
    status: 200,
    data: {
      project_id: projectId,
      milestones: milestones.rows,
      total_count: milestones.rowCount,
    },
  };
};
