const pool = require("../config/db");

exports.maintenanceStatus = async () => {
  try {
    await pool.query("SELECT 1");
    return { status: 200, data: { database: "ok", timestamp: new Date().toISOString() } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};

exports.clearOldAuditLogs = async ({ body, userId }) => {
  const { days = 365 } = body || {};
  try {
    const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const r = await pool.query(
      "DELETE FROM audit_logs WHERE created_at < $1 RETURNING audit_log_id",
      [cutoff]
    );
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        userId,
        "clear_old_audit_logs",
        "audit_logs",
        null,
        `deleted ${r.rowCount} logs older than ${days} days`,
        null,
      ]
    );
    return { status: 200, data: { message: "Old audit logs cleared", deleted: r.rowCount } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};

exports.listProjects = async ({ query }) => {
  const { limit = 100, offset = 0 } = query || {};
  try {
    const r = await pool.query(
      `SELECT p.*, s.startup_name, u.email AS startup_email
			 FROM projects p
			 JOIN startups s ON s.startup_id = p.startup_id
			 JOIN users u ON u.user_id = s.user_id
			 ORDER BY p.created_at DESC
			 LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return { status: 200, data: { projects: r.rows } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};

exports.adminListInvestmentRequests = async () => {
  try {
    const r = await pool.query(
      `SELECT ir.*, s.startup_name, i.organization_name AS investor_organization, p.project_title
			 FROM investment_requests ir
			 JOIN startups s ON s.startup_id = ir.startup_id
			 JOIN investors i ON i.investor_id = ir.investor_id
			 JOIN projects p ON p.project_id = ir.project_id
			 ORDER BY ir.created_at DESC`
    );
    return { status: 200, data: { investment_requests: r.rows } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};

exports.updateInvestmentRequestStatus = async ({ id, body, userId }) => {
  const { status, comment } = body || {};
  try {
    const allowed = ["pending", "approved", "rejected", "withdrawn"];
    if (!allowed.includes(status)) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }

    const result = await pool.query(
      "UPDATE investment_requests SET status = $1 WHERE investment_request_id = $2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0) {
      const error = new Error("Investment request not found");
      error.status = 404;
      throw error;
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, "update_investment_request", "investment_requests", id, comment || null, null]
    );

    const rr = await pool.query(
      `SELECT ir.*, su.user_id AS startup_user_id, iu.user_id AS investor_user_id
			 FROM investment_requests ir
			 JOIN startups s ON s.startup_id = ir.startup_id
			 JOIN users su ON su.user_id = s.user_id
			 JOIN investors inv ON inv.investor_id = ir.investor_id
			 JOIN users iu ON iu.user_id = inv.user_id
			 WHERE ir.investment_request_id = $1`,
      [id]
    );

    if (rr.rowCount) {
      const row = rr.rows[0];
      const title = `Investment request ${status}`;
      const message = comment || `Investment request has been ${status} by an administrator.`;
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
        [row.startup_user_id, "investment", title, message, "investment_requests", id]
      );
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
        [row.investor_user_id, "investment", title, message, "investment_requests", id]
      );
    }

    return { status: 200, data: { message: "Status updated", investment_request: result.rows[0] } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = err.status || 500;
    throw error;
  }
};

exports.listInvestments = async ({ query }) => {
  const { limit = 100, offset = 0 } = query || {};
  try {
    const r = await pool.query(
      `SELECT inv.*, ir.requested_amount, ir.project_id, p.project_title,
					su_user.first_name AS startup_first_name, iv_user.first_name AS investor_first_name,
					s.startup_id, iv.investor_id
			 FROM investments inv
			 JOIN investment_requests ir ON ir.investment_request_id = inv.investment_request_id
			 JOIN projects p ON p.project_id = ir.project_id
			 JOIN startups s ON s.startup_id = ir.startup_id
			 JOIN users su_user ON su_user.user_id = s.user_id
			 JOIN investors iv ON iv.investor_id = ir.investor_id
			 JOIN users iv_user ON iv_user.user_id = iv.user_id
			 ORDER BY inv.created_at DESC
			 LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return { status: 200, data: { investments: r.rows } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};

exports.updateProjectStatus = async ({ projectId, body, userId }) => {
  const { status, comment } = body || {};
  try {
    const allowed = ["draft", "active", "funded", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }
    const r = await pool.query(
      "UPDATE projects SET status = $1 WHERE project_id = $2 RETURNING *",
      [status, projectId]
    );
    if (!r.rowCount) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, "update_project_status", "projects", projectId, comment || null, null]
    );
    return { status: 200, data: { message: "Project status updated", project: r.rows[0] } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = err.status || 500;
    throw error;
  }
};

exports.listSessions = async ({ query }) => {
  const { host_id, participant_id, status, limit = 100, offset = 0 } = query || {};
  try {
    const where = [];
    const params = [];
    if (host_id) {
      params.push(host_id);
      where.push(`host_id = $${params.length}`);
    }
    if (participant_id) {
      params.push(participant_id);
      where.push(`participant_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    const whereClause = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
    params.push(limit);
    params.push(offset);
    const q = `SELECT vs.*, u1.email AS host_email, u2.email AS participant_email FROM video_sessions vs LEFT JOIN users u1 ON u1.user_id = vs.host_id LEFT JOIN users u2 ON u2.user_id = vs.participant_id${whereClause} ORDER BY vs.scheduled_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await pool.query(q, params);
    return { status: 200, data: { sessions: r.rows } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};

exports.listPayments = async ({ query }) => {
  const { user_id, status, from_date, to_date, limit = 100, offset = 0 } = query || {};
  try {
    const where = [];
    const params = [];
    if (user_id) {
      params.push(user_id);
      where.push(`(p.from_user_id = $${params.length} OR p.to_user_id = $${params.length})`);
    }
    if (status) {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }
    if (from_date) {
      params.push(from_date);
      where.push(`p.created_at >= $${params.length}`);
    }
    if (to_date) {
      params.push(to_date);
      where.push(`p.created_at <= $${params.length}`);
    }
    const whereClause = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
    params.push(limit);
    params.push(offset);
    const q = `SELECT p.*, 
			fu.email AS from_user_email,
			fu.first_name AS from_user_first_name,
			fu.last_name AS from_user_last_name,
			tu.email AS to_user_email,
			tu.first_name AS to_user_first_name,
			tu.last_name AS to_user_last_name,
			fu.email AS user_email
			FROM payments p
			LEFT JOIN users fu ON fu.user_id = p.from_user_id
			LEFT JOIN users tu ON tu.user_id = p.to_user_id${whereClause}
			ORDER BY p.created_at DESC
			LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await pool.query(q, params);
    return { status: 200, data: { payments: r.rows } };
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    throw error;
  }
};
