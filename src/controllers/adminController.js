const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const mail = require("../utils/mail");

// GET /api/admin/users/pending — users with completed role profile, awaiting verification
exports.listPendingUsers = async (_req, res) => {
  try {
    const usersRes = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.phone_number,
              u.is_approved, u.is_active, u.verification_status, u.account_status,
              u.profile_submitted_at, u.created_at
       FROM users u
       WHERE u.role IN ('Startup', 'Mentor', 'Investor')
         AND COALESCE(u.verification_status, CASE WHEN u.is_approved THEN 'approved' ELSE 'pending' END) = 'pending'
         AND u.deleted_at IS NULL
         AND (
           u.profile_submitted_at IS NOT NULL
           OR EXISTS (SELECT 1 FROM startups s WHERE s.user_id = u.user_id)
           OR EXISTS (SELECT 1 FROM mentors m WHERE m.user_id = u.user_id)
           OR EXISTS (SELECT 1 FROM investors i WHERE i.user_id = u.user_id)
         )
       ORDER BY COALESCE(u.profile_submitted_at, u.created_at) DESC NULLS LAST`
    );

    return res.json({ pending: usersRes.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users/pending/:userId
// Returns user account and role-specific profile + uploaded documents
exports.getPendingUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const userRes = await pool.query(
      `SELECT user_id, first_name, last_name, email, role, phone_number, is_approved, is_active,
              verification_status, account_status, profile_submitted_at, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const user = userRes.rows[0];

    // fetch role-specific profile
    let profile = null;
    if (user.role === "Startup") {
      const p = await pool.query("SELECT * FROM startups WHERE user_id = $1", [userId]);
      profile = p.rows[0] || null;
    } else if (user.role === "Investor") {
      const p = await pool.query("SELECT * FROM investors WHERE user_id = $1", [userId]);
      profile = p.rows[0] || null;
    } else if (user.role === "Mentor") {
      const p = await pool.query("SELECT * FROM mentors WHERE user_id = $1", [userId]);
      profile = p.rows[0] || null;
    }

    // Unified documents + legacy role-specific tables
    let documents = [];
    const unified = await pool.query(
      `SELECT document_id, document_type, file_name, original_name, file_url, file_path, mime_type,
              file_size_bytes, public_id, context_type, context_id, created_at, 'documents' AS source
       FROM documents WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    documents = unified.rows;

    if (user.role === "Mentor" && profile && profile.mentor_id) {
      const docs = await pool.query(
        "SELECT mentor_document_id AS document_id, document_type, file_name, file_path AS file_url, file_type AS mime_type, file_size_bytes, created_at, 'mentor_documents' AS source FROM mentor_documents WHERE mentor_id = $1",
        [profile.mentor_id]
      );
      for (const row of docs.rows) {
        if (!documents.some((d) => d.document_id === row.document_id && d.source === row.source)) {
          documents.push(row);
        }
      }
    } else if (user.role === "Investor" && profile && profile.investor_id) {
      try {
        const docs = await pool.query(
          "SELECT investor_document_id AS document_id, document_type, file_name, file_path AS file_url, file_type AS mime_type, file_size_bytes, created_at, 'investor_documents' AS source FROM investor_documents WHERE investor_id = $1",
          [profile.investor_id]
        );
        for (const row of docs.rows) {
          documents.push(row);
        }
      } catch {
        /* table optional */
      }
    }

    return res.json({ user, profile, documents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/users/reject/:userId  (mark is_active=false)
exports.rejectUser = async (req, res) => {
  const { userId } = req.params;
  const admin = req.user;
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET verification_status = 'rejected',
           is_approved = false,
           is_active = false,
           account_status = 'suspended',
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING user_id, email, is_active, verification_status`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });

    await pool.query("UPDATE mentors SET verification_status = 'rejected' WHERE user_id = $1", [
      userId,
    ]);
    await pool.query("UPDATE investors SET verification_status = 'rejected' WHERE user_id = $1", [
      userId,
    ]);

    // audit
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin.user_id, "reject_user", "users", userId, reason || null, null]
    );

    // notify the user
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        "account",
        "Account rejected",
        reason || "Your account was rejected by an administrator.",
        "users",
        userId,
      ]
    );

    // send rejection email if available
    try {
      const userEmailRes = await pool.query("SELECT email FROM users WHERE user_id = $1", [userId]);
      const to = userEmailRes.rows[0] && userEmailRes.rows[0].email;
      if (to) {
        await mail.sendMail(
          to,
          "Account rejected — StartupConnect",
          `Hello,\n\nYour account registration was rejected. Reason: ${reason || "Not specified"}`,
          `<p>Hello,</p><p>Your account registration was <strong>rejected</strong>.</p><p>Reason: ${reason || "Not specified"}</p>`
        );
      }
    } catch (e) {
      console.error("Failed sending rejection email", e.message || e);
    }

    return res.json({
      message: "User rejected and deactivated",
      user: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users  (search / list)
exports.searchUsers = async (req, res) => {
  const { q, role, verification_status, account_status, limit = 50, offset = 0 } = req.query;
  try {
    let base =
      "SELECT user_id, first_name, last_name, email, role, is_active, is_approved, verification_status, account_status, profile_submitted_at, created_at FROM users";
    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`
      );
    }
    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    if (verification_status) {
      params.push(verification_status);
      where.push(`COALESCE(verification_status, CASE WHEN is_approved THEN 'approved' ELSE 'pending' END) = $${params.length}`);
    }
    if (account_status) {
      params.push(account_status);
      where.push(`COALESCE(account_status, CASE WHEN is_active THEN 'active' ELSE 'suspended' END) = $${params.length}`);
    }
    where.push("deleted_at IS NULL");
    const whereClause = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
    params.push(limit);
    params.push(offset);
    const qstr = `${base}${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await pool.query(qstr, params);
    return res.json({ users: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/dashboard/summary — user & verification KPIs (foundation)
exports.getFoundationDashboard = async (_req, res) => {
  try {
    const [
      totalUsers,
      byRole,
      pendingVerification,
      mentorCount,
      startupCount,
      investorCount,
      sessionCount,
      paymentSum,
    ] = await Promise.all([
      pool.query(
        "SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL AND role <> 'Admin'"
      ),
      pool.query(
        "SELECT role, COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL GROUP BY role ORDER BY role"
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM users u
         WHERE u.role IN ('Startup','Mentor','Investor')
           AND COALESCE(u.verification_status, CASE WHEN u.is_approved THEN 'approved' ELSE 'pending' END) = 'pending'
           AND u.deleted_at IS NULL
           AND (
             u.profile_submitted_at IS NOT NULL
             OR EXISTS (SELECT 1 FROM startups s WHERE s.user_id = u.user_id)
             OR EXISTS (SELECT 1 FROM mentors m WHERE m.user_id = u.user_id)
             OR EXISTS (SELECT 1 FROM investors i WHERE i.user_id = u.user_id)
           )`
      ),
      pool.query("SELECT COUNT(*)::int AS c FROM mentors"),
      pool.query("SELECT COUNT(*)::int AS c FROM startups"),
      pool.query("SELECT COUNT(*)::int AS c FROM investors"),
      pool.query("SELECT COUNT(*)::int AS c FROM mentorship_sessions"),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE status = 'completed'"
      ),
    ]);

    return res.json({
      totals: {
        users_excluding_admin: totalUsers.rows[0].c,
        mentors: mentorCount.rows[0].c,
        startups: startupCount.rows[0].c,
        investors: investorCount.rows[0].c,
        mentorship_sessions: sessionCount.rows[0].c,
        payments_completed_sum: paymentSum.rows[0].total,
      },
      users_by_role: byRole.rows,
      pending_verification_queue: pendingVerification.rows[0].c,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/audit-logs
exports.listAuditLogs = async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  try {
    const r = await pool.query(
      `SELECT audit_log_id, actor_user_id, action, entity_type, entity_id, details, metadata, created_at
			 FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json({ logs: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/users/approve/:userId  (Admin only, with optional comment)
exports.approveUser = async (req, res) => {
  const { userId } = req.params;
  const admin = req.user;
  const { comment } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET is_approved = true,
           verification_status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, email, is_approved, verification_status`,
      [admin.user_id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });

    await pool.query(
      "UPDATE mentors SET verification_status = 'approved' WHERE user_id = $1",
      [userId]
    );
    await pool.query(
      "UPDATE investors SET verification_status = 'approved' WHERE user_id = $1",
      [userId]
    );

    // audit
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin.user_id, "approve_user", "users", userId, comment || null, null]
    );

    // notify the user
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        "account",
        "Account approved",
        "Your account has been approved by an administrator.",
        "users",
        userId,
      ]
    );

    return res.json({ message: "User approved", user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/documents/:documentId  -> download the stored document (secure)
exports.getDocument = async (req, res) => {
  const { documentId } = req.params;
  try {
    const r = await pool.query("SELECT * FROM documents WHERE document_id = $1", [documentId]);
    if (r.rows.length === 0) return res.status(404).json({ message: "Document not found" });
    const doc = r.rows[0];
    const remote = doc.file_url || (doc.file_path && String(doc.file_path).startsWith("http") ? doc.file_path : null);
    if (remote) {
      return res.redirect(302, remote);
    }
    if (!doc.file_path) return res.status(404).json({ message: "File not available" });
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const absPath = path.resolve(process.cwd(), doc.file_path);
    if (!absPath.startsWith(uploadsDir))
      return res.status(400).json({ message: "Invalid file path" });
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: "File missing on server" });
    return res.sendFile(absPath);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getMentorDocument = async (req, res) => {
  const { documentId } = req.params;
  try {
    const r = await pool.query("SELECT * FROM mentor_documents WHERE mentor_document_id = $1", [
      documentId,
    ]);
    if (r.rows.length === 0) return res.status(404).json({ message: "Document not found" });
    const doc = r.rows[0];
    if (doc.file_path && String(doc.file_path).startsWith("http")) {
      return res.redirect(302, doc.file_path);
    }
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const absPath = path.resolve(process.cwd(), doc.file_path);
    if (!absPath.startsWith(uploadsDir))
      return res.status(400).json({ message: "Invalid file path" });
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: "File missing on server" });
    return res.sendFile(absPath);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteMentorDocumentAdmin = async (req, res) => {
  const { documentId } = req.params;
  const admin = req.user;
  try {
    const id = Number(documentId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid document id" });
    }

    const r = await pool.query(
      "SELECT md.*, m.user_id AS owner_user_id FROM mentor_documents md JOIN mentors m ON m.mentor_id = md.mentor_id WHERE md.mentor_document_id = $1",
      [id]
    );

    if (!r.rowCount) return res.status(404).json({ message: "Document not found" });
    const doc = r.rows[0];

    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const absPath = path.resolve(process.cwd(), doc.file_path);
    if (absPath.startsWith(uploadsDir) && fs.existsSync(absPath)) {
      try {
        fs.unlinkSync(absPath);
      } catch (e) {
        console.error("Failed removing file:", e.message || e);
      }
    }

    await pool.query("DELETE FROM mentor_documents WHERE mentor_document_id = $1", [id]);

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        admin.user_id,
        "delete_mentor_document",
        "mentor_documents",
        id,
        `Deleted mentor document ${doc.file_name} for mentor_id ${doc.mentor_id}`,
        null,
      ]
    );

    if (doc.owner_user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          doc.owner_user_id,
          "mentor_document",
          "Document removed by admin",
          `An administrator removed your uploaded document ${doc.file_name}`,
          "mentor_documents",
          id,
        ]
      );
    }

    return res.json({ message: "Mentor document deleted by admin" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users/:userId  -> full user + profile (admin view)
exports.getUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const userRes = await pool.query(
      `SELECT user_id, first_name, last_name, email, role, phone_number, is_active, is_approved,
              verification_status, account_status, profile_submitted_at, created_at
			 FROM users WHERE user_id = $1`,
      [userId]
    );
    if (!userRes.rowCount) return res.status(404).json({ message: "User not found" });
    const user = userRes.rows[0];

    let profile = null;
    if (user.role === "Startup") {
      const p = await pool.query("SELECT * FROM startups WHERE user_id = $1", [userId]);
      profile = p.rows[0] || null;
    } else if (user.role === "Investor") {
      const p = await pool.query("SELECT * FROM investors WHERE user_id = $1", [userId]);
      profile = p.rows[0] || null;
    } else if (user.role === "Mentor") {
      const p = await pool.query("SELECT * FROM mentors WHERE user_id = $1", [userId]);
      profile = p.rows[0] || null;
    }

    return res.json({ user, profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/users/:userId  -> deactivate or hard delete when ?hard=true
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  const { hard } = req.query;
  const admin = req.user;
  try {
    if (hard === "true") {
      // hard delete (dangerous) - cascade will remove related rows
      const r = await pool.query("DELETE FROM users WHERE user_id = $1 RETURNING user_id, email", [
        userId,
      ]);
      if (!r.rowCount) return res.status(404).json({ message: "User not found" });
      await pool.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
        [admin.user_id, "delete_user", "users", userId, "hard delete", null]
      );
      return res.json({ message: "User hard-deleted", user: r.rows[0] });
    }

    // soft deactivate
    const r = await pool.query(
      "UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id, email, is_active",
      [userId]
    );
    if (!r.rowCount) return res.status(404).json({ message: "User not found" });
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "deactivate_user", "users", userId, null, null]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        userId,
        "account",
        "Account deactivated",
        "Your account was deactivated by an administrator.",
        "users",
        userId,
      ]
    );
    return res.json({ message: "User deactivated", user: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/startups
exports.listStartups = async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  try {
    const r = await pool.query(
      `SELECT s.*, u.email AS owner_email, u.is_active, u.is_approved
			 FROM startups s
			 JOIN users u ON u.user_id = s.user_id
			 ORDER BY s.created_at DESC
			 LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json({ startups: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/startups/:startupId/remove  -> deactivate startup owner
exports.removeStartupListing = async (req, res) => {
  const { startupId } = req.params;
  const admin = req.user;
  try {
    const rr = await pool.query("SELECT user_id FROM startups WHERE startup_id = $1", [startupId]);
    if (!rr.rowCount) return res.status(404).json({ message: "Startup not found" });
    const userId = rr.rows[0].user_id;
    const r = await pool.query(
      "UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id, email, is_active",
      [userId]
    );
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "remove_startup_listing", "startups", startupId, null, null]
    );
    return res.json({
      message: "Startup listing removed (owner deactivated)",
      user: r.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/startups/:startupId/approve  -> set is_listed = true (create column if missing)
exports.approveStartup = async (req, res) => {
  const { startupId } = req.params;
  const admin = req.user;
  try {
    // ensure column exists
    await pool.query(
      "ALTER TABLE startups ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT FALSE"
    );
    const rr = await pool.query(
      "UPDATE startups SET is_listed = true WHERE startup_id = $1 RETURNING *",
      [startupId]
    );
    if (!rr.rowCount) return res.status(404).json({ message: "Startup not found" });
    // notify owner
    const uidRes = await pool.query("SELECT user_id FROM startups WHERE startup_id = $1", [
      startupId,
    ]);
    const uid = uidRes.rows[0] && uidRes.rows[0].user_id;
    if (uid) {
      await pool.query(
        "INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          uid,
          "startup",
          "Startup listing approved",
          "Your startup listing has been approved and is now visible.",
          "startups",
          startupId,
        ]
      );
    }
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "approve_startup", "startups", startupId, null, null]
    );
    return res.json({
      message: "Startup approved/listed",
      startup: rr.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/startups/:startupId/unapprove  -> set is_listed = false
exports.unapproveStartup = async (req, res) => {
  const { startupId } = req.params;
  const admin = req.user;
  const { reason } = req.body || {};
  try {
    await pool.query(
      "ALTER TABLE startups ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT FALSE"
    );
    const rr = await pool.query(
      "UPDATE startups SET is_listed = false WHERE startup_id = $1 RETURNING *",
      [startupId]
    );
    if (!rr.rowCount) return res.status(404).json({ message: "Startup not found" });
    const uidRes = await pool.query("SELECT user_id FROM startups WHERE startup_id = $1", [
      startupId,
    ]);
    const uid = uidRes.rows[0] && uidRes.rows[0].user_id;
    if (uid) {
      await pool.query(
        "INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          uid,
          "startup",
          "Startup listing unapproved",
          reason
            ? `Listing unapproved: ${reason}`
            : "Your startup listing was unapproved by admin.",
          "startups",
          startupId,
        ]
      );
    }
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "unapprove_startup", "startups", startupId, reason || null, null]
    );
    return res.json({
      message: "Startup unapproved/unlisted",
      startup: rr.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/mentors/:mentorId/approve  -> set mentors.is_approved = true
exports.approveMentor = async (req, res) => {
  const { mentorId } = req.params;
  const admin = req.user;
  try {
    await pool.query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE"
    );
    await pool.query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'"
    );
    const rr = await pool.query(
      "UPDATE mentors SET is_approved = true, verification_status = 'approved' WHERE mentor_id = $1 RETURNING *",
      [mentorId]
    );
    if (!rr.rowCount) return res.status(404).json({ message: "Mentor not found" });
    const uidRes = await pool.query("SELECT user_id FROM mentors WHERE mentor_id = $1", [mentorId]);
    const uid = uidRes.rows[0] && uidRes.rows[0].user_id;
    if (uid) {
      await pool.query(
        "INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          uid,
          "mentor",
          "Mentor profile approved",
          "Your mentor profile has been approved.",
          "mentors",
          mentorId,
        ]
      );
    }
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "approve_mentor", "mentors", mentorId, null, null]
    );
    return res.json({ message: "Mentor approved", mentor: rr.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/mentors/:mentorId/unapprove
exports.unapproveMentor = async (req, res) => {
  const { mentorId } = req.params;
  const admin = req.user;
  const { reason } = req.body || {};
  try {
    await pool.query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE"
    );
    await pool.query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'"
    );
    const rr = await pool.query(
      "UPDATE mentors SET is_approved = false, verification_status = 'rejected' WHERE mentor_id = $1 RETURNING *",
      [mentorId]
    );
    if (!rr.rowCount) return res.status(404).json({ message: "Mentor not found" });
    const uidRes = await pool.query("SELECT user_id FROM mentors WHERE mentor_id = $1", [mentorId]);
    const uid = uidRes.rows[0] && uidRes.rows[0].user_id;
    if (uid) {
      await pool.query(
        "INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          uid,
          "mentor",
          "Mentor profile unapproved",
          reason ? `Unapproved: ${reason}` : "Your mentor profile was unapproved by admin.",
          "mentors",
          mentorId,
        ]
      );
    }
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "unapprove_mentor", "mentors", mentorId, reason || null, null]
    );
    return res.json({ message: "Mentor unapproved", mentor: rr.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/investors/:investorId/approve
exports.approveInvestor = async (req, res) => {
  const { investorId } = req.params;
  const admin = req.user;
  try {
    await pool.query(
      "ALTER TABLE investors ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE"
    );
    const rr = await pool.query(
      "UPDATE investors SET is_approved = true WHERE investor_id = $1 RETURNING *",
      [investorId]
    );
    if (!rr.rowCount) return res.status(404).json({ message: "Investor not found" });
    const uidRes = await pool.query("SELECT user_id FROM investors WHERE investor_id = $1", [
      investorId,
    ]);
    const uid = uidRes.rows[0] && uidRes.rows[0].user_id;
    if (uid) {
      await pool.query(
        "INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          uid,
          "investor",
          "Investor profile approved",
          "Your investor profile has been approved.",
          "investors",
          investorId,
        ]
      );
    }
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "approve_investor", "investors", investorId, null, null]
    );
    return res.json({ message: "Investor approved", investor: rr.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/investors/:investorId/unapprove
exports.unapproveInvestor = async (req, res) => {
  const { investorId } = req.params;
  const admin = req.user;
  const { reason } = req.body || {};
  try {
    await pool.query(
      "ALTER TABLE investors ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE"
    );
    const rr = await pool.query(
      "UPDATE investors SET is_approved = false WHERE investor_id = $1 RETURNING *",
      [investorId]
    );
    if (!rr.rowCount) return res.status(404).json({ message: "Investor not found" });
    const uidRes = await pool.query("SELECT user_id FROM investors WHERE investor_id = $1", [
      investorId,
    ]);
    const uid = uidRes.rows[0] && uidRes.rows[0].user_id;
    if (uid) {
      await pool.query(
        "INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          uid,
          "investor",
          "Investor profile unapproved",
          reason ? `Unapproved: ${reason}` : "Your investor profile was unapproved by admin.",
          "investors",
          investorId,
        ]
      );
    }
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "unapprove_investor", "investors", investorId, reason || null, null]
    );
    return res.json({ message: "Investor unapproved", investor: rr.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/projects/:projectId/status
exports.updateProjectStatus = async (req, res) => {
  const { projectId } = req.params;
  const { status, comment } = req.body || {};
  const admin = req.user;
  try {
    const allowed = ["draft", "active", "funded", "completed", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const r = await pool.query(
      "UPDATE projects SET status = $1 WHERE project_id = $2 RETURNING *",
      [status, projectId]
    );
    if (!r.rowCount) return res.status(404).json({ message: "Project not found" });
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "update_project_status", "projects", projectId, comment || null, null]
    );
    return res.json({ message: "Project status updated", project: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/reports/overview
exports.reportsOverview = async (req, res) => {
  try {
    const counts = await pool.query(
      `SELECT
				 (SELECT COUNT(*)::int FROM users) AS users,
				 (SELECT COUNT(*)::int FROM users WHERE role='Startup') AS startups,
				 (SELECT COUNT(*)::int FROM users WHERE role='Investor') AS investors,
				 (SELECT COUNT(*)::int FROM users WHERE role='Mentor') AS mentors,
				 (SELECT COUNT(*)::int FROM projects) AS projects,
				 (SELECT COUNT(*)::int FROM investment_requests) AS investment_requests,
				 (SELECT COUNT(*)::int FROM investments) AS investments,
				 (SELECT COUNT(*)::int FROM payments) AS payments,
				 (SELECT COUNT(*)::int FROM video_sessions) AS sessions
			 `
    );
    return res.json({ overview: counts.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/sessions
// List all video sessions with optional filters (host, participant, status)
exports.listSessions = async (req, res) => {
  const { host_id, participant_id, status, limit = 100, offset = 0 } = req.query;
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
    return res.json({ sessions: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/payments
// List all payments with optional filters (user, status, date range)
exports.listPayments = async (req, res) => {
  const { user_id, status, from_date, to_date, limit = 100, offset = 0 } = req.query;
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
    return res.json({ payments: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/users/:userId/status
exports.updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body || {};
  const admin = req.user;
  try {
    const allowed = ["active", "suspended", "deleted"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

    // update status and keep is_active for compatibility
    const isActive = status === "active";
    const r = await pool.query(
      "UPDATE users SET status = $1, is_active = $2 WHERE user_id = $3 RETURNING user_id, email, status, is_active",
      [status, isActive, userId]
    );
    if (!r.rowCount) return res.status(404).json({ message: "User not found" });

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "update_user_status", "users", userId, `status=${status}`, null]
    );

    return res.json({ message: "User status updated", user: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/reports
exports.listReports = async (req, res) => {
  const {
    status,
    target_type,
    limit = 50,
    offset = 0,
    sort_by = "created_at",
    sort_order = "DESC",
  } = req.query;
  try {
    const where = [];
    const params = [];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (target_type) {
      params.push(target_type);
      where.push(`target_type = $${params.length}`);
    }
    params.push(limit);
    params.push(offset);
    const allowedSortFields = ["created_at", "status", "report_id"];
    const sortBy = allowedSortFields.includes(sort_by) ? sort_by : "created_at";
    const sortDir = ["ASC", "DESC"].includes(sort_order.toUpperCase())
      ? sort_order.toUpperCase()
      : "DESC";
    const whereClause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const q = `SELECT * FROM reports ${whereClause} ORDER BY ${sortBy} ${sortDir} LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await pool.query(q, params);
    return res.json({ reports: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/reports/:reportId
exports.updateReportStatus = async (req, res) => {
  const { reportId } = req.params;
  const { status, action_taken } = req.body || {};
  const admin = req.user;
  try {
    const allowed = ["pending", "reviewed", "actioned"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const r = await pool.query(
      "UPDATE reports SET status = $1, metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb WHERE report_id = $3 RETURNING *",
      [
        status,
        JSON.stringify({
          action_taken: action_taken || null,
          reviewed_by: admin.user_id,
        }),
        reportId,
      ]
    );
    if (!r.rowCount) return res.status(404).json({ message: "Report not found" });

    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "update_report", "reports", reportId, status, null]
    );

    return res.json({ message: "Report updated", report: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/documents  -> list documents with filters and sorting
exports.listDocuments = async (req, res) => {
  const {
    type,
    startup_id,
    mentor_id,
    limit = 50,
    offset = 0,
    sort_by = "created_at",
    sort_order = "DESC",
  } = req.query;
  try {
    const where = [];
    const params = [];
    if (type) {
      params.push(type);
      where.push(`file_type = $${params.length}`);
    }
    if (startup_id) {
      params.push(startup_id);
      where.push(`startup_id = $${params.length}`);
    }
    if (mentor_id) {
      params.push(mentor_id);
      where.push(`mentor_id = $${params.length}`);
    }
    params.push(limit);
    params.push(offset);
    const allowedSortFields = ["created_at", "file_type", "file_size_bytes", "file_name"];
    const sortBy = allowedSortFields.includes(sort_by) ? sort_by : "created_at";
    const sortDir = ["ASC", "DESC"].includes(sort_order.toUpperCase())
      ? sort_order.toUpperCase()
      : "DESC";
    const whereClause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const q = `SELECT document_id, startup_id, file_name, file_type, file_size_bytes, created_at FROM documents ${whereClause} ORDER BY ${sortBy} ${sortDir} LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await pool.query(q, params);
    return res.json({ documents: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/messages/:id
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  const admin = req.user;
  try {
    const r = await pool.query("DELETE FROM messages WHERE message_id = $1 RETURNING *", [id]);
    if (!r.rowCount) return res.status(404).json({ message: "Message not found" });
    await pool.query(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [admin.user_id, "delete_message", "messages", id, null, null]
    );
    return res.json({ message: "Message deleted", deleted: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Maintenance endpoints (limited safe ops)
// GET /api/admin/maintenance/status
exports.maintenanceStatus = async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ database: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/maintenance/clear-audit-logs  body: { days: 90 }
exports.clearOldAuditLogs = async (req, res) => {
  const { days = 365 } = req.body || {};
  const admin = req.user;
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
        admin.user_id,
        "clear_old_audit_logs",
        "audit_logs",
        null,
        `deleted ${r.rowCount} logs older than ${days} days`,
        null,
      ]
    );
    return res.json({ message: "Old audit logs cleared", deleted: r.rowCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/create-admin
// body: { first_name, last_name, email, password, privilege_level }
exports.createAdmin = async (req, res) => {
  const { first_name, last_name, email, password, privilege_level = 1 } = req.body || {};
  const adminUser = req.user;
  try {
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "first_name,last_name,email,password required" });
    }

    // Prevent creation if email already exists
    const existing = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
    if (existing.rowCount) return res.status(409).json({ error: "User already exists" });

    const bcrypt = require("bcrypt");
    const hashed = await bcrypt.hash(password, 10);

    const r = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_approved, is_active)
			 VALUES ($1,$2,$3,$4,'Admin',true,true) RETURNING user_id, email`,
      [first_name, last_name, email, hashed]
    );

    const userId = r.rows[0].user_id;
    // insert into admins table
    await pool.query("INSERT INTO admins (user_id, privilege_level) VALUES ($1,$2)", [
      userId,
      Number(privilege_level) || 1,
    ]);

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [adminUser.user_id, "create_admin", "users", userId, null, null]
    );

    return res.status(201).json({ message: "Admin created", admin: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/projects/:projectId/remove  (content moderation - remove project)
exports.removeProject = async (req, res) => {
  const { projectId } = req.params;
  const admin = req.user;
  try {
    const r = await pool.query(
      "UPDATE projects SET status = $1 WHERE project_id = $2 RETURNING *",
      ["cancelled", projectId]
    );
    if (!r.rowCount) return res.status(404).json({ message: "Project not found" });
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "remove_project", "projects", projectId, null, null]
    );
    return res.json({ message: "Project removed", project: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/projects/:projectId/restore  (restore project to active)
exports.restoreProject = async (req, res) => {
  const { projectId } = req.params;
  const admin = req.user;
  try {
    const r = await pool.query(
      "UPDATE projects SET status = $1 WHERE project_id = $2 RETURNING *",
      ["active", projectId]
    );
    if (!r.rowCount) return res.status(404).json({ message: "Project not found" });
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "restore_project", "projects", projectId, null, null]
    );
    return res.json({ message: "Project restored", project: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/mentorship/resources/:id  (remove resource)
exports.deleteMentorshipResource = async (req, res) => {
  const { id } = req.params;
  const admin = req.user;
  try {
    const r = await pool.query(
      "DELETE FROM mentorship_resources WHERE resource_id = $1 RETURNING *",
      [id]
    );
    if (!r.rowCount) return res.status(404).json({ message: "Resource not found" });
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "delete_mentorship_resource", "mentorship_resources", id, null, null]
    );
    return res.json({ message: "Resource deleted", resource: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/documents/:documentId  (remove document and attempt to unlink file)
exports.deleteDocumentAdmin = async (req, res) => {
  const { documentId } = req.params;
  const admin = req.user;
  try {
    const r = await pool.query("SELECT * FROM documents WHERE document_id = $1", [documentId]);
    if (!r.rowCount) return res.status(404).json({ message: "Document not found" });
    const doc = r.rows[0];
    // try unlink file
    try {
      const fs = require("fs");
      const path = require("path");
      const abs = path.resolve(process.cwd(), doc.file_path);
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    } catch (e) {
      // ignore file unlink errors
      console.error("unlink failed", e.message || e);
    }
    const del = await pool.query("DELETE FROM documents WHERE document_id = $1 RETURNING *", [
      documentId,
    ]);
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "delete_document", "documents", documentId, null, null]
    );
    return res.json({ message: "Document removed", document: del.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/audit-logs/export?since=2026-01-01&until=2026-04-30
// returns CSV
exports.exportAuditLogs = async (req, res) => {
  const { since, until } = req.query;
  try {
    const params = [];
    let where = "";
    if (since) {
      params.push(since);
      where += ` AND created_at >= $${params.length}`;
    }
    if (until) {
      params.push(until);
      where += ` AND created_at <= $${params.length}`;
    }
    const q = `SELECT audit_log_id, actor_user_id, action, entity_type, entity_id, details, metadata, created_at FROM audit_logs WHERE 1=1 ${where} ORDER BY created_at DESC`;
    const r = await pool.query(q, params);
    // build CSV
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="audit_logs.csv"');
    const rows = r.rows;
    const header =
      "audit_log_id,actor_user_id,action,entity_type,entity_id,details,metadata,created_at\n";
    res.write(header);
    for (const row of rows) {
      const line = `${row.audit_log_id},${row.actor_user_id || ""},${(row.action || "").replace(/\,/g, " ")},${row.entity_type || ""},${row.entity_id || ""},"${(row.details || "").toString().replace(/"/g, '""')}","${JSON.stringify(row.metadata || {}).replace(/"/g, '""')}",${row.created_at.toISOString()}\n`;
      res.write(line);
    }
    return res.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/reports/export?type=users|projects|investments
exports.exportReportCSV = async (req, res) => {
  const { type } = req.query;
  try {
    let q;
    if (type === "users") {
      q =
        "SELECT user_id, first_name, last_name, email, role, is_active, is_approved, created_at FROM users ORDER BY created_at DESC";
    } else if (type === "projects") {
      q =
        "SELECT project_id, project_title, startup_id, funding_goal, amount_raised, status, start_date, end_date, created_at FROM projects ORDER BY created_at DESC";
    } else if (type === "investments") {
      q =
        "SELECT investment_id, investment_request_id, amount, equity_percentage, status, created_at FROM investments ORDER BY created_at DESC";
    } else {
      return res.status(400).json({ error: "unknown report type" });
    }
    const r = await pool.query(q);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_report.csv"`);
    if (r.rows.length === 0) return res.end("");
    const keys = Object.keys(r.rows[0]);
    res.write(keys.join(",") + "\n");
    for (const row of r.rows) {
      const vals = keys.map((k) => {
        const v = row[k];
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString();
        return String(v).replace(/\"/g, '"');
      });
      res.write(vals.join(",") + "\n");
    }
    return res.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/reports/schedule  (placeholder: records request in audit_logs as scheduled)
exports.scheduleReport = async (req, res) => {
  const { type, run_at } = req.body || {};
  const admin = req.user;
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        admin.user_id,
        "schedule_report",
        "reports",
        null,
        `type=${type} run_at=${run_at || "immediate"}`,
        null,
      ]
    );
    return res.json({
      message: "Report scheduled (placeholder)",
      type,
      run_at: run_at || "immediate",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/projects
exports.listProjects = async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
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
    return res.json({ projects: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/investment-requests
exports.adminListInvestmentRequests = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ir.*, s.startup_name, i.organization_name AS investor_organization, p.project_title
			 FROM investment_requests ir
			 JOIN startups s ON s.startup_id = ir.startup_id
			 JOIN investors i ON i.investor_id = ir.investor_id
			 JOIN projects p ON p.project_id = ir.project_id
			 ORDER BY ir.created_at DESC`
    );
    return res.json({ investment_requests: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/investment-requests/:id/status
// body: { status: 'approved'|'rejected'|'withdrawn'|'pending', comment?: string }
exports.updateInvestmentRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body || {};
  const admin = req.user;
  try {
    const allowed = ["pending", "approved", "rejected", "withdrawn"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const result = await pool.query(
      "UPDATE investment_requests SET status = $1 WHERE investment_request_id = $2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Investment request not found" });

    // audit log
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details, metadata)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
      [admin.user_id, "update_investment_request", "investment_requests", id, comment || null, null]
    );

    // notify both startup and investor users
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

      // notify startup
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
        [row.startup_user_id, "investment", title, message, "investment_requests", id]
      );

      // notify investor
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
				 VALUES ($1,$2,$3,$4,$5,$6)`,
        [row.investor_user_id, "investment", title, message, "investment_requests", id]
      );
    }

    return res.json({
      message: "Status updated",
      investment_request: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/investments
exports.listInvestments = async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
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
    return res.json({ investments: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/reports - Create a user report/flag
exports.createReport = async (req, res) => {
  const { target_id, target_type, reason } = req.body || {};
  const user = req.user;
  try {
    if (!target_type || !reason) {
      return res.status(400).json({ error: "target_type and reason are required" });
    }

    const allowedTypes = ["user", "content", "message", "profile"];
    if (!allowedTypes.includes(target_type)) {
      return res.status(400).json({ error: "Invalid target_type" });
    }

    // Check for duplicate recent reports (rate limiting)
    const recentCount = await pool.query(
      `SELECT COUNT(*) as cnt FROM reports 
			 WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [user.user_id]
    );

    if (recentCount.rows[0].cnt > 10) {
      return res.status(429).json({
        error: "Too many reports. Please try again later.",
      });
    }

    const r = await pool.query(
      `INSERT INTO reports (user_id, target_id, target_type, reason, status, metadata)
			 VALUES ($1, $2, $3, $4, 'pending', $5)
			 RETURNING report_id, user_id, target_id, target_type, reason, status, created_at`,
      [user.user_id, target_id || null, target_type, reason, JSON.stringify({})]
    );

    // Notify admins of new report
    const admins = await pool.query(
      "SELECT user_id FROM users WHERE role = 'Admin' AND is_active = true"
    );
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          admin.user_id,
          "moderation",
          "New Report Submitted",
          `New ${target_type} report submitted by user ${user.user_id}`,
          "reports",
          r.rows[0].report_id,
        ]
      );
    }

    return res.status(201).json({
      message: "Report submitted",
      report: r.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/my - Get user's own reports
exports.getUserReports = async (req, res) => {
  const { limit = 50, offset = 0, status } = req.query;
  const user = req.user;
  try {
    const params = [user.user_id];
    let whereClause = "user_id = $1";

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const r = await pool.query(
      `SELECT report_id, target_id, target_type, reason, status, created_at
			 FROM reports
			 WHERE ${whereClause}
			 ORDER BY created_at DESC
			 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return res.json({ reports: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
