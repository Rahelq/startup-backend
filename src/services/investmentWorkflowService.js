const pool = require("../config/db");
const realtimeEmitter = require("../utils/realtimeEmitter");

async function getInvestmentRelationshipWithContext(investmentId) {
  const result = await pool.query(
    `SELECT 
			ir.*,
			inv_rel.investment_id,
			inv_rel.funding_amount,
			inv_rel.equity_percentage,
			inv_rel.status AS relationship_status,
			u_inv.user_id AS investor_user_id,
			u_inv.first_name AS investor_first_name,
			u_inv.last_name AS investor_last_name,
			u_inv.email AS investor_email,
			u_startup.user_id AS startup_user_id,
			u_startup.first_name AS startup_first_name,
			u_startup.last_name AS startup_last_name,
			u_startup.email AS startup_email,
			i.organization_name,
			s.startup_name
		 FROM investment_relationships inv_rel
		 JOIN interaction_requests ir ON ir.interaction_id = inv_rel.interaction_request_id
		 JOIN users u_inv ON u_inv.user_id = inv_rel.investor_id
		 JOIN users u_startup ON u_startup.user_id = inv_rel.startup_id
		 JOIN investors i ON i.user_id = u_inv.user_id
		 JOIN startups s ON s.user_id = u_startup.user_id
		 WHERE inv_rel.investment_id = $1`,
    [investmentId]
  );
  return result.rowCount ? result.rows[0] : null;
}

exports.createInvestmentOffer = async ({ userId, role, body }) => {
  const { receiver_id, funding_amount, equity_percentage, message, type } = body || {};

  if (!receiver_id || !funding_amount) {
    const err = new Error("receiver_id, funding_amount are required");
    err.status = 400;
    throw err;
  }

  const fundingAmount = Number(funding_amount);
  if (Number.isNaN(fundingAmount) || fundingAmount <= 0) {
    const err = new Error("funding_amount must be positive");
    err.status = 400;
    throw err;
  }

  const equityPct = equity_percentage ? Number(equity_percentage) : null;
  if (equityPct && (Number.isNaN(equityPct) || equityPct < 0 || equityPct > 100)) {
    const err = new Error("equity_percentage must be 0-100");
    err.status = 400;
    throw err;
  }

  const interactionRes = await pool.query(
    `INSERT INTO interaction_requests 
		 (sender_id, receiver_id, type, category, message, funding_amount, equity_offer)
		 VALUES ($1, $2, $3, 'investment', $4, $5, $6)
		 RETURNING interaction_id, sender_id, receiver_id, type, status`,
    [userId, receiver_id, type || "invite", message || null, fundingAmount, equityPct]
  );

  const interaction = interactionRes.rows[0];

  const investmentRes = await pool.query(
    `INSERT INTO investment_relationships 
		 (investor_id, startup_id, interaction_request_id, funding_amount, equity_percentage, status)
		 VALUES ($1, $2, $3, $4, $5, 'pending')
		 RETURNING investment_id`,
    [
      role === "Investor" ? userId : receiver_id,
      role === "Startup" ? userId : receiver_id,
      interaction.interaction_id,
      fundingAmount,
      equityPct,
    ]
  );

  await pool.query(
    `INSERT INTO interaction_audit 
		 (interaction_id, action, actor_user_id, details)
		 VALUES ($1, 'investment_offer_created', $2, $3)`,
    [
      interaction.interaction_id,
      userId,
      JSON.stringify({ funding_amount: fundingAmount, equity_percentage: equityPct }),
    ]
  );

  const offerType = type === "request" ? "Investment Request" : "Investment Offer";
  const notifRes = await pool.query(
    `INSERT INTO notifications 
		 (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'investment', $2, $3, 'investment_relationships', $4)
		 RETURNING notification_id, created_at`,
    [
      receiver_id,
      offerType,
      `Received ${offerType}: $${fundingAmount} at ${equityPct || 0}% equity`,
      investmentRes.rows[0].investment_id,
    ]
  );

  if (notifRes.rows.length > 0) {
    realtimeEmitter.emitNotificationCreated(receiver_id, {
      notification_id: notifRes.rows[0].notification_id,
      user_id: receiver_id,
      notification_type: offerType,
      title: offerType,
      message: `Received ${offerType}: $${fundingAmount} at ${equityPct || 0}% equity`,
      reference_type: "investment_relationships",
      reference_id: investmentRes.rows[0].investment_id,
      created_at: notifRes.rows[0].created_at,
    });
  }

  return {
    status: 201,
    data: {
      message: "Investment offer created",
      investment_id: investmentRes.rows[0].investment_id,
      interaction_id: interaction.interaction_id,
    },
  };
};

exports.getInvestmentOffer = async ({ userId, investmentId }) => {
  const investment = await getInvestmentRelationshipWithContext(investmentId);
  if (!investment) {
    const err = new Error("Investment not found");
    err.status = 404;
    throw err;
  }
  if (investment.investor_user_id !== userId && investment.startup_user_id !== userId) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }
  return { status: 200, data: { investment } };
};

exports.submitCounterOffer = async ({ userId, investmentId, body }) => {
  const { funding_amount, equity_percentage, message } = body || {};
  const investment = await getInvestmentRelationshipWithContext(investmentId);
  if (!investment) {
    const err = new Error("Investment not found");
    err.status = 404;
    throw err;
  }

  const isInvestor = investment.investor_user_id === userId;
  const isStartup = investment.startup_user_id === userId;
  if (!isInvestor && !isStartup) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const newFunding = funding_amount ? Number(funding_amount) : investment.funding_amount;
  const newEquity = equity_percentage ? Number(equity_percentage) : investment.equity_percentage;
  if (Number.isNaN(newFunding) || newFunding <= 0) {
    const err = new Error("funding_amount must be positive");
    err.status = 400;
    throw err;
  }
  if (Number.isNaN(newEquity) || newEquity < 0 || newEquity > 100) {
    const err = new Error("equity_percentage must be 0-100");
    err.status = 400;
    throw err;
  }

  const auditRes = await pool.query(
    `INSERT INTO interaction_audit 
		 (interaction_id, action, actor_user_id, details)
		 VALUES ($1, 'counter_offer_proposed', $2, $3)
		 RETURNING audit_id`,
    [
      investment.interaction_id,
      userId,
      JSON.stringify({
        proposed_funding_amount: newFunding,
        proposed_equity_percentage: newEquity,
        previous_funding_amount: investment.funding_amount,
        previous_equity_percentage: investment.equity_percentage,
        message: message || null,
        timestamp: new Date().toISOString(),
      }),
    ]
  );

  await pool.query(
    `UPDATE investment_relationships 
		 SET status = 'countered', updated_at = NOW()
		 WHERE investment_id = $1`,
    [investmentId]
  );

  const otherPartyId = isInvestor ? investment.startup_user_id : investment.investor_user_id;
  const counterNotifRes = await pool.query(
    `INSERT INTO notifications 
		 (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'investment', $2, $3, 'investment_relationships', $4)
		 RETURNING notification_id, created_at`,
    [
      otherPartyId,
      "Counter Offer Received",
      `New counter-offer: $${newFunding} at ${newEquity}% equity`,
      investmentId,
    ]
  );

  if (counterNotifRes.rows.length > 0) {
    realtimeEmitter.emitNotificationCreated(otherPartyId, {
      notification_id: counterNotifRes.rows[0].notification_id,
      user_id: otherPartyId,
      notification_type: "investment",
      title: "Counter Offer Received",
      message: `New counter-offer: $${newFunding} at ${newEquity}% equity`,
      reference_type: "investment_relationships",
      reference_id: investmentId,
      created_at: counterNotifRes.rows[0].created_at,
    });
  }

  return {
    status: 200,
    data: {
      message: "Counter offer submitted",
      counter_offer_id: auditRes.rows[0].audit_id,
      proposed_funding_amount: newFunding,
      proposed_equity_percentage: newEquity,
    },
  };
};

exports.respondToInvestmentOffer = async ({ userId, investmentId, body }) => {
  const { status } = body || {};
  if (!["accepted", "rejected"].includes(status)) {
    const err = new Error("Status must be accepted or rejected");
    err.status = 400;
    throw err;
  }

  const investment = await getInvestmentRelationshipWithContext(investmentId);
  if (!investment) {
    const err = new Error("Investment not found");
    err.status = 404;
    throw err;
  }

  if (status === "accepted" && investment.startup_user_id !== userId) {
    const err = new Error("Only startup can accept investment");
    err.status = 403;
    throw err;
  }
  if (
    status === "rejected" &&
    investment.startup_user_id !== userId &&
    investment.investor_user_id !== userId
  ) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const updateRes = await pool.query(
    `UPDATE investment_relationships 
		 SET status = $1, updated_at = NOW()
		 WHERE investment_id = $2
		 RETURNING *`,
    [status, investmentId]
  );

  await pool.query(
    `UPDATE interaction_requests 
		 SET status = $1, updated_at = NOW()
		 WHERE interaction_id = $2`,
    [status, investment.interaction_id]
  );

  await pool.query(
    `INSERT INTO interaction_audit 
		 (interaction_id, action, actor_user_id, details)
		 VALUES ($1, $2, $3, $4)`,
    [investment.interaction_id, `investment_${status}`, userId, null]
  );

  const otherPartyId =
    investment.investor_user_id === userId
      ? investment.startup_user_id
      : investment.investor_user_id;
  await pool.query(
    `INSERT INTO notifications 
		 (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'investment', $2, $3, 'investment_relationships', $4)`,
    [otherPartyId, `Investment ${status}`, `Investment offer was ${status}`, investmentId]
  );

  realtimeEmitter.emitInvestmentStatusChanged(investmentId, status, [
    investment.investor_user_id,
    investment.startup_user_id,
  ]);

  return { status: 200, data: { message: `Investment ${status}`, investment: updateRes.rows[0] } };
};

exports.getInvestmentNegotiationHistory = async ({ userId, investmentId }) => {
  const investment = await getInvestmentRelationshipWithContext(investmentId);
  if (!investment) {
    const err = new Error("Investment not found");
    err.status = 404;
    throw err;
  }
  if (investment.investor_user_id !== userId && investment.startup_user_id !== userId) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const history = await pool.query(
    `SELECT audit_id, action, actor_user_id, details, created_at
		 FROM interaction_audit
		 WHERE interaction_id = $1
		 ORDER BY created_at ASC`,
    [investment.interaction_id]
  );

  return {
    status: 200,
    data: {
      investment_id: investmentId,
      current_status: investment.relationship_status,
      current_funding_amount: investment.funding_amount,
      current_equity_percentage: investment.equity_percentage,
      negotiation_history: history.rows,
    },
  };
};

exports.getMyInvestmentPortfolio = async ({ userId }) => {
  const investments = await pool.query(
    `SELECT 
			ir.*,
			inv_rel.investment_id,
			inv_rel.funding_amount,
			inv_rel.equity_percentage,
			inv_rel.status AS relationship_status,
			u_startup.first_name AS startup_first_name,
			u_startup.last_name AS startup_last_name,
			u_startup.email AS startup_email,
			s.startup_name
		 FROM investment_relationships inv_rel
		 JOIN interaction_requests ir ON ir.interaction_id = inv_rel.interaction_request_id
		 JOIN users u_startup ON u_startup.user_id = inv_rel.startup_id
		 JOIN startups s ON s.user_id = inv_rel.startup_id
		 WHERE inv_rel.investor_id = (SELECT user_id FROM investors WHERE user_id = $1)
		 ORDER BY ir.created_at DESC`,
    [userId]
  );

  const totals = await pool.query(
    `SELECT 
			COUNT(*) as total_investments,
			SUM(CASE WHEN status IN ('active', 'accepted') THEN 1 ELSE 0 END) as active_count,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
			SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
			SUM(funding_amount) as total_funded,
			AVG(equity_percentage) as avg_equity
		 FROM investment_relationships
		 WHERE investor_id = (SELECT user_id FROM investors WHERE user_id = $1)`,
    [userId]
  );

  return { status: 200, data: { portfolio: investments.rows, summary: totals.rows[0] } };
};

exports.recordInvestmentPayment = async ({ userId, investmentId, body }) => {
  const { amount, payment_status, payment_method, notes } = body || {};
  const investment = await getInvestmentRelationshipWithContext(investmentId);
  if (!investment) {
    const err = new Error("Investment not found");
    err.status = 404;
    throw err;
  }
  if (investment.investor_user_id !== userId) {
    const err = new Error("Only investor can record payments");
    err.status = 403;
    throw err;
  }

  const paymentAmount = Number(amount);
  if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
    const err = new Error("amount must be positive");
    err.status = 400;
    throw err;
  }
  const validStatuses = ["pending", "completed", "escrowed", "released"];
  if (!validStatuses.includes(payment_status)) {
    const err = new Error("Invalid payment_status");
    err.status = 400;
    throw err;
  }

  const paymentRes = await pool.query(
    `INSERT INTO payments 
		 (from_user_id, to_user_id, amount, payment_method, status, reference_type, reference_id, gateway_metadata)
		 VALUES ($1, $2, $3, $4, $5, 'investment_relationships', $6, $7)
		 RETURNING payment_id, amount, status, created_at`,
    [
      userId,
      investment.startup_user_id,
      paymentAmount,
      payment_method || "transfer",
      payment_status === "escrowed" || payment_status === "released" ? "completed" : payment_status,
      investmentId,
      JSON.stringify({
        investment_id: investmentId,
        workflow_status: payment_status,
        notes: notes || null,
      }),
    ]
  );

  await pool.query(
    `INSERT INTO interaction_audit 
		 (interaction_id, action, actor_user_id, details)
		 VALUES ($1, 'investment_payment_recorded', $2, $3)`,
    [
      investment.interaction_id,
      userId,
      JSON.stringify({
        payment_id: paymentRes.rows[0].payment_id,
        amount: paymentAmount,
        status: payment_status,
      }),
    ]
  );

  await pool.query(
    `INSERT INTO notifications 
		 (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'payment', $2, $3, 'payments', $4)`,
    [
      investment.startup_user_id,
      "Investment Payment",
      `Payment of $${paymentAmount} (${payment_status})`,
      paymentRes.rows[0].payment_id,
    ]
  );

  realtimeEmitter.emitInvestmentStatusChanged(investmentId, `payment_${payment_status}`, [
    investment.investor_user_id,
    investment.startup_user_id,
  ]);

  return {
    status: 201,
    data: { message: "Investment payment recorded", payment: paymentRes.rows[0] },
  };
};

exports.getReceivedInvestments = async ({ userId }) => {
  const investments = await pool.query(
    `SELECT 
			ir.*,
			inv_rel.investment_id,
			inv_rel.funding_amount,
			inv_rel.equity_percentage,
			inv_rel.status AS relationship_status,
			u_investor.first_name AS investor_first_name,
			u_investor.last_name AS investor_last_name,
			u_investor.email AS investor_email,
			i.organization_name
		 FROM investment_relationships inv_rel
		 JOIN interaction_requests ir ON ir.interaction_id = inv_rel.interaction_request_id
		 JOIN users u_investor ON u_investor.user_id = inv_rel.investor_id
		 JOIN investors i ON i.user_id = inv_rel.investor_id
		 WHERE inv_rel.startup_id = (SELECT user_id FROM startups WHERE user_id = $1)
		 ORDER BY ir.created_at DESC`,
    [userId]
  );
  return {
    status: 200,
    data: { received_investments: investments.rows, total_count: investments.rowCount },
  };
};

exports.getAllInvestments = async ({ query }) => {
  const { status, limit = 50, offset = 0 } = query || {};
  let sql = `SELECT 
		ir.*,
		inv_rel.investment_id,
		inv_rel.funding_amount,
		inv_rel.equity_percentage,
		inv_rel.status AS relationship_status,
		u_investor.first_name AS investor_first_name,
		u_investor.last_name AS investor_last_name,
		u_startup.first_name AS startup_first_name,
		u_startup.last_name AS startup_last_name
	 FROM investment_relationships inv_rel
	 JOIN interaction_requests ir ON ir.interaction_id = inv_rel.interaction_request_id
	 JOIN users u_investor ON u_investor.user_id = inv_rel.investor_id
	 JOIN users u_startup ON u_startup.user_id = inv_rel.startup_id
	 WHERE 1=1`;
  const params = [];
  if (status) {
    params.push(status);
    sql += ` AND inv_rel.status = $${params.length}`;
  }
  params.push(limit);
  params.push(offset);
  sql += ` ORDER BY ir.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const result = await pool.query(sql, params);
  return { status: 200, data: { investments: result.rows, total_count: result.rowCount } };
};

exports.submitStartupFeedback = async ({ userId, role, investmentId, body }) => {
  if (role !== "Investor") {
    const err = new Error("Only investors can submit startup feedback");
    err.status = 403;
    throw err;
  }
  const investment = await getInvestmentRelationshipWithContext(investmentId);
  if (!investment) {
    const err = new Error("Investment not found");
    err.status = 404;
    throw err;
  }
  if (investment.investor_user_id !== userId) {
    const err = new Error("Not authorized for this investment");
    err.status = 403;
    throw err;
  }
  let { rating, comment } = body || {};
  rating = Number(rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const err = new Error("rating must be between 1 and 5");
    err.status = 400;
    throw err;
  }

  const feedbackRes = await pool.query(
    `INSERT INTO interaction_audit
		 (interaction_id, action, actor_user_id, details)
		 VALUES ($1, 'startup_feedback_submitted', $2, $3)
		 RETURNING audit_id, created_at`,
    [
      investment.interaction_id,
      userId,
      JSON.stringify({ investment_id: Number(investmentId), rating, comment: comment || null }),
    ]
  );

  const notifRes = await pool.query(
    `INSERT INTO notifications
		 (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1, 'investment', $2, $3, 'investment_relationships', $4)
		 RETURNING notification_id, created_at`,
    [
      investment.startup_user_id,
      "Investor feedback received",
      "An investor submitted feedback for your startup.",
      investmentId,
    ]
  );

  if (notifRes.rows.length > 0) {
    realtimeEmitter.emitNotificationCreated(investment.startup_user_id, {
      notification_id: notifRes.rows[0].notification_id,
      user_id: investment.startup_user_id,
      notification_type: "investment",
      title: "Investor feedback received",
      message: "An investor submitted feedback for your startup.",
      reference_type: "investment_relationships",
      reference_id: Number(investmentId),
      created_at: notifRes.rows[0].created_at,
    });
  }

  return {
    status: 201,
    data: {
      message: "Startup feedback saved",
      feedback: {
        feedback_id: feedbackRes.rows[0].audit_id,
        investment_id: Number(investmentId),
        rating,
        comment: comment || null,
        created_at: feedbackRes.rows[0].created_at,
      },
    },
  };
};

exports.listStartupFeedback = async ({ userId, role }) => {
  if (role !== "Startup") {
    const err = new Error("Only startups can view investor feedback");
    err.status = 403;
    throw err;
  }

  const result = await pool.query(
    `SELECT
			a.audit_id AS feedback_id,
			inv_rel.investment_id,
			a.actor_user_id AS investor_user_id,
			u.first_name,
			u.last_name,
			a.details->>'rating' AS rating,
			a.details->>'comment' AS comment,
			a.created_at
		 FROM interaction_audit a
		 JOIN investment_relationships inv_rel
		   ON inv_rel.interaction_request_id = a.interaction_id
		 JOIN users u ON u.user_id = a.actor_user_id
		 WHERE inv_rel.startup_id = $1
		   AND a.action = 'startup_feedback_submitted'
		 ORDER BY a.created_at DESC`,
    [userId]
  );

  const feedback = result.rows.map((row) => ({
    ...row,
    rating: row.rating ? Number(row.rating) : null,
  }));

  return { status: 200, data: { feedback } };
};
