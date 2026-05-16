const pool = require("../config/db");

// ============================================
// 1. CREATE INTERACTION (Request or Invite)
// ============================================
exports.createInteraction = async (req, res) => {
  const { receiver_id, type, category, message, funding_amount, equity_offer } = req.body || {};
  const sender_id = req.user.user_id;

  try {
    // ✅ Validation 1: Required fields
    if (!receiver_id || !type || !category) {
      return res.status(400).json({ error: "receiver_id, type, category are required" });
    }

    // ✅ Validation 2: Valid enums
    const validTypes = ["request", "invite"];
    const validCategories = ["mentorship", "investment"];

    if (!validTypes.includes(type) || !validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid type or category" });
    }

    // ✅ Validation 3: No self-interaction
    if (sender_id === parseInt(receiver_id)) {
      return res.status(400).json({ error: "Cannot send interaction to yourself" });
    }

    // ✅ Validation 4: Check both users exist and are approved/active
    const senderRes = await pool.query(
      "SELECT user_id, role, is_approved, is_active FROM users WHERE user_id = $1",
      [sender_id]
    );
    const receiverRes = await pool.query(
      "SELECT user_id, role, is_approved, is_active FROM users WHERE user_id = $1",
      [receiver_id]
    );

    if (senderRes.rowCount === 0 || receiverRes.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const sender = senderRes.rows[0];
    const receiver = receiverRes.rows[0];

    // Check approval & active status
    if (!sender.is_approved || !sender.is_active) {
      return res.status(403).json({ error: "Sender account is not approved or active" });
    }

    if (!receiver.is_approved || !receiver.is_active) {
      return res.status(403).json({ error: "Receiver account is not approved or active" });
    }

    // ✅ Validation 5: Role validation for category
    if (category === "mentorship") {
      // One must be mentor, one must be startup
      const senderIsMentor = sender.role === "Mentor";
      const receiverIsStartup = receiver.role === "Startup";
      const senderIsStartup = sender.role === "Startup";
      const receiverIsMentor = receiver.role === "Mentor";

      if (!((senderIsMentor && receiverIsStartup) || (senderIsStartup && receiverIsMentor))) {
        return res.status(400).json({
          error: "Mentorship interaction requires one Mentor and one Startup",
        });
      }
    } else if (category === "investment") {
      // One must be investor, one must be startup
      const senderIsInvestor = sender.role === "Investor";
      const receiverIsStartup = receiver.role === "Startup";
      const senderIsStartup = sender.role === "Startup";
      const receiverIsInvestor = receiver.role === "Investor";

      if (!((senderIsInvestor && receiverIsStartup) || (senderIsStartup && receiverIsInvestor))) {
        return res.status(400).json({
          error: "Investment interaction requires one Investor and one Startup",
        });
      }
    }

    // ✅ Validation 6: Prevent duplicate pending interactions (bidirectional check)
    const duplicateCheck = await pool.query(
      `SELECT interaction_id FROM interaction_requests 
			 WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
			 AND status = 'pending' 
			 AND category = $3`,
      [sender_id, receiver_id, category]
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        error: "A pending interaction of this type already exists between these users",
      });
    }

    // ✅ Validation 7: Check for existing accepted relationship
    if (category === "mentorship") {
      const existingMentorship = await pool.query(
        `SELECT mentorship_id FROM mentorship_relationships
				 WHERE (mentor_id = $1 AND startup_id = $2) OR (mentor_id = $2 AND startup_id = $1)`,
        [sender_id, receiver_id]
      );
      if (existingMentorship.rowCount > 0) {
        return res.status(409).json({
          error: "A mentorship relationship already exists between these users",
        });
      }
    } else if (category === "investment") {
      const existingInvestment = await pool.query(
        `SELECT investment_id FROM investment_relationships
				 WHERE (investor_id = $1 AND startup_id = $2) OR (investor_id = $2 AND startup_id = $1)`,
        [sender_id, receiver_id]
      );
      if (existingInvestment.rowCount > 0) {
        return res.status(409).json({
          error: "An investment relationship already exists between these users",
        });
      }
    }

    // ✅ All validations passed - Insert interaction
    const insertRes = await pool.query(
      `INSERT INTO interaction_requests (sender_id, receiver_id, type, category, message, funding_amount, equity_offer)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING interaction_id, sender_id, receiver_id, type, category, message, status, created_at`,
      [
        sender_id,
        receiver_id,
        type,
        category,
        message || null,
        funding_amount || null,
        equity_offer || null,
      ]
    );

    const interaction = insertRes.rows[0];

    // ✅ Audit log
    await pool.query(
      `INSERT INTO interaction_audit (interaction_id, action, actor_user_id, details)
			 VALUES ($1, $2, $3, $4)`,
      [interaction.interaction_id, "created", sender_id, JSON.stringify({ type, category })]
    );

    // ✅ Notify receiver
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        receiver_id,
        "interaction",
        category === "mentorship" ? "Mentorship Request" : "Investment Offer",
        `${sender.role} sent you a ${type} for ${category}`,
        "interaction_requests",
        interaction.interaction_id,
      ]
    );

    return res.status(201).json({
      message: "Interaction created",
      interaction,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// 2. RESPOND TO INTERACTION (Accept/Reject)
// ============================================
exports.respondToInteraction = async (req, res) => {
  const { interactionId } = req.params;
  const { status } = req.body || {};
  const user_id = req.user.user_id;

  try {
    // ✅ Validation 1: Status must be valid
    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
    }

    // ✅ Validation 2: Get interaction
    const interactionRes = await pool.query(
      "SELECT * FROM interaction_requests WHERE interaction_id = $1",
      [interactionId]
    );

    if (interactionRes.rowCount === 0) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    const interaction = interactionRes.rows[0];

    // ✅ Validation 3: Only receiver can respond
    if (interaction.receiver_id !== user_id) {
      return res.status(403).json({ error: "Only the receiver can respond to this interaction" });
    }

    // ✅ Validation 4: Can only respond to pending interactions
    if (interaction.status !== "pending") {
      return res.status(400).json({
        error: `Cannot respond to a ${interaction.status} interaction`,
      });
    }

    // ✅ Update status
    const updatedRes = await pool.query(
      "UPDATE interaction_requests SET status = $1, updated_at = NOW() WHERE interaction_id = $2 RETURNING *",
      [status, interactionId]
    );

    const updated = updatedRes.rows[0];

    // ✅ If accepted, create relationship — determine roles to avoid flipped IDs
    if (status === "accepted") {
      // fetch roles for both participants
      const senderRoleRes = await pool.query("SELECT role FROM users WHERE user_id = $1", [
        interaction.sender_id,
      ]);
      const receiverRoleRes = await pool.query("SELECT role FROM users WHERE user_id = $1", [
        interaction.receiver_id,
      ]);
      const senderRole = senderRoleRes.rowCount ? senderRoleRes.rows[0].role : null;
      const receiverRole = receiverRoleRes.rowCount ? receiverRoleRes.rows[0].role : null;

      if (interaction.category === "mentorship") {
        let mentor_id, startup_id;
        if (senderRole === "Mentor") {
          mentor_id = interaction.sender_id;
          startup_id = interaction.receiver_id;
        } else if (receiverRole === "Mentor") {
          mentor_id = interaction.receiver_id;
          startup_id = interaction.sender_id;
        } else {
          // fallback: keep original ordering but log
          mentor_id = interaction.sender_id;
          startup_id = interaction.receiver_id;
        }

        await pool.query(
          `INSERT INTO mentorship_relationships (mentor_id, startup_id, interaction_request_id)
					 VALUES ($1, $2, $3)`,
          [mentor_id, startup_id, interactionId]
        );
      } else if (interaction.category === "investment") {
        let investor_id, startup_id;
        if (senderRole === "Investor") {
          investor_id = interaction.sender_id;
          startup_id = interaction.receiver_id;
        } else if (receiverRole === "Investor") {
          investor_id = interaction.receiver_id;
          startup_id = interaction.sender_id;
        } else {
          investor_id = interaction.sender_id;
          startup_id = interaction.receiver_id;
        }

        await pool.query(
          `INSERT INTO investment_relationships (investor_id, startup_id, interaction_request_id, funding_amount, equity_percentage)
					 VALUES ($1, $2, $3, $4, $5)`,
          [
            investor_id,
            startup_id,
            interactionId,
            interaction.funding_amount,
            interaction.equity_offer,
          ]
        );
      }
    }

    // ✅ Audit log
    await pool.query(
      `INSERT INTO interaction_audit (interaction_id, action, actor_user_id, details)
			 VALUES ($1, $2, $3, $4)`,
      [interactionId, `${status}_by_receiver`, user_id, null]
    );

    // ✅ Notify sender
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        interaction.sender_id,
        "interaction",
        status === "accepted" ? "Request Accepted" : "Request Rejected",
        `Your ${interaction.category} ${interaction.type} was ${status}`,
        "interaction_requests",
        interactionId,
      ]
    );

    return res.json({
      message: `Interaction ${status}`,
      interaction: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// 3. CANCEL INTERACTION
// ============================================
exports.cancelInteraction = async (req, res) => {
  const { interactionId } = req.params;
  const user_id = req.user.user_id;

  try {
    // ✅ Get interaction
    const interactionRes = await pool.query(
      "SELECT * FROM interaction_requests WHERE interaction_id = $1",
      [interactionId]
    );

    if (interactionRes.rowCount === 0) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    const interaction = interactionRes.rows[0];

    // ✅ Only sender can cancel
    if (interaction.sender_id !== user_id) {
      return res.status(403).json({ error: "Only the sender can cancel this interaction" });
    }

    // ✅ Only pending can be cancelled
    if (interaction.status !== "pending") {
      return res.status(400).json({
        error: `Cannot cancel a ${interaction.status} interaction`,
      });
    }

    // ✅ Delete interaction
    const deletedRes = await pool.query(
      "UPDATE interaction_requests SET status = 'cancelled', updated_at = NOW() WHERE interaction_id = $1 RETURNING *",
      [interactionId]
    );

    // ✅ Audit log
    await pool.query(
      `INSERT INTO interaction_audit (interaction_id, action, actor_user_id, details)
			 VALUES ($1, $2, $3, $4)`,
      [interactionId, "cancelled_by_sender", user_id, null]
    );

    // ✅ Notify receiver
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, reference_type, reference_id)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        interaction.receiver_id,
        "interaction",
        "Request Cancelled",
        `${interaction.type} for ${interaction.category} was cancelled`,
        "interaction_requests",
        interactionId,
      ]
    );

    return res.json({
      message: "Interaction cancelled",
      interaction: deletedRes.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// 4. GET MY INTERACTIONS
// ============================================
exports.getMyInteractions = async (req, res) => {
  const { type, category, status, limit = 50, offset = 0 } = req.query;
  const user_id = req.user.user_id;

  try {
    let query = `
			SELECT ir.*, 
				   u_sender.first_name as sender_name, u_sender.role as sender_role,
				   u_receiver.first_name as receiver_name, u_receiver.role as receiver_role
			FROM interaction_requests ir
			JOIN users u_sender ON u_sender.user_id = ir.sender_id
			JOIN users u_receiver ON u_receiver.user_id = ir.receiver_id
			WHERE (ir.sender_id = $1 OR ir.receiver_id = $1)
		`;

    const params = [user_id];

    if (type) {
      params.push(type);
      query += ` AND ir.type = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND ir.category = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND ir.status = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    query += ` ORDER BY ir.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Format response
    const interactions = result.rows.map((row) => ({
      ...row,
      direction: row.sender_id === user_id ? "sent" : "received",
    }));

    return res.json({
      interactions,
      total: result.rowCount,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// 5. GET SINGLE INTERACTION
// ============================================
exports.getInteraction = async (req, res) => {
  const { interactionId } = req.params;
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT ir.*, 
					u_sender.first_name as sender_name, u_sender.role as sender_role,
					u_receiver.first_name as receiver_name, u_receiver.role as receiver_role
			 FROM interaction_requests ir
			 JOIN users u_sender ON u_sender.user_id = ir.sender_id
			 JOIN users u_receiver ON u_receiver.user_id = ir.receiver_id
			 WHERE ir.interaction_id = $1 AND (ir.sender_id = $2 OR ir.receiver_id = $2)`,
      [interactionId, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Interaction not found or access denied" });
    }

    return res.json({
      interaction: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// 6. ADMIN: View all interactions (with filters)
// ============================================
exports.adminGetInteractions = async (req, res) => {
  const { category, status, limit = 100, offset = 0 } = req.query;

  try {
    let query = `
			SELECT ir.*, 
				   u_sender.first_name as sender_name, u_sender.role as sender_role, u_sender.email as sender_email,
				   u_receiver.first_name as receiver_name, u_receiver.role as receiver_role, u_receiver.email as receiver_email
			FROM interaction_requests ir
			JOIN users u_sender ON u_sender.user_id = ir.sender_id
			JOIN users u_receiver ON u_receiver.user_id = ir.receiver_id
			WHERE 1=1
		`;

    const params = [];

    if (category) {
      params.push(category);
      query += ` AND ir.category = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND ir.status = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    query += ` ORDER BY ir.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    return res.json({
      interactions: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ============================================
// 7. GET ACTIVE RELATIONSHIPS
// ============================================
exports.getActiveMentorships = async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT mr.*, 
					u_mentor.first_name as mentor_name, u_mentor.email as mentor_email,
					u_startup.first_name as startup_name, u_startup.email as startup_email
			 FROM mentorship_relationships mr
			 JOIN users u_mentor ON u_mentor.user_id = mr.mentor_id
			 JOIN users u_startup ON u_startup.user_id = mr.startup_id
			 WHERE (mr.mentor_id = $1 OR mr.startup_id = $1)
			 AND mr.status = 'active'
			 ORDER BY mr.created_at DESC
			 LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    return res.json({
      mentorships: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getActiveInvestments = async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT inv.*, 
					u_investor.first_name as investor_name, u_investor.email as investor_email,
					u_startup.first_name as startup_name, u_startup.email as startup_email
			 FROM investment_relationships inv
			 JOIN users u_investor ON u_investor.user_id = inv.investor_id
			 JOIN users u_startup ON u_startup.user_id = inv.startup_id
			 WHERE (inv.investor_id = $1 OR inv.startup_id = $1)
			 AND inv.status = 'active'
			 ORDER BY inv.created_at DESC
			 LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    return res.json({
      investments: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
