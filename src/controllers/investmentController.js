const pool = require("../config/db");

async function getInvestorIdByUserId(userId) {
	const result = await pool.query(
		"SELECT investor_id FROM investors WHERE user_id = $1",
		[userId],
	);
	return result.rowCount ? result.rows[0].investor_id : null;
}

async function getStartupIdByUserId(userId) {
	const result = await pool.query(
		"SELECT startup_id FROM startups WHERE user_id = $1",
		[userId],
	);
	return result.rowCount ? result.rows[0].startup_id : null;
}

function parsePositiveNumber(value, fieldName) {
	const parsed = Number(value);
	if (Number.isNaN(parsed) || parsed <= 0) {
		const err = new Error(`${fieldName} must be a positive number`);
		err.status = 400;
		throw err;
	}
	return parsed;
}

async function notifyUser(userId, type, title, message, referenceType, referenceId) {
	await pool.query(
		`INSERT INTO notifications
		 (user_id, notification_type, title, message, reference_type, reference_id)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		[userId, type, title, message, referenceType, referenceId],
	);
}

async function getInvestmentRequestForActor(requestId, user) {
	const result = await pool.query(
		`SELECT
			ir.*,
			p.project_title,
			s.startup_name,
			s.user_id AS startup_user_id,
			i.organization_name,
			i.user_id AS investor_user_id
		 FROM investment_requests ir
		 JOIN projects p ON p.project_id = ir.project_id
		 JOIN startups s ON s.startup_id = ir.startup_id
		 JOIN investors i ON i.investor_id = ir.investor_id
		 WHERE ir.investment_request_id = $1`,
		[requestId],
	);

	if (!result.rowCount) return null;
	const row = result.rows[0];

	if (user.role === "Startup" && row.startup_user_id !== user.user_id) {
		return false;
	}
	if (user.role === "Investor" && row.investor_user_id !== user.user_id) {
		return false;
	}
	return row;
}

exports.createInvestmentRequest = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const investorId = await getInvestorIdByUserId(userId);

		if (!investorId) {
			return res.status(404).json({ error: "Investor profile not found" });
		}

		let { project_id, requested_amount, proposal_message, equity_percentage } =
			req.body || {};
		const projectId = Number(project_id);
		if (!Number.isInteger(projectId) || projectId <= 0) {
			return res.status(400).json({ error: "project_id is required" });
		}

		requested_amount = parsePositiveNumber(requested_amount, "requested_amount");

		if (
			equity_percentage !== undefined &&
			equity_percentage !== null &&
			equity_percentage !== ""
		) {
			equity_percentage = Number(equity_percentage);
			if (
				Number.isNaN(equity_percentage) ||
				equity_percentage < 0 ||
				equity_percentage > 100
			) {
				return res
					.status(400)
					.json({ error: "equity_percentage must be between 0 and 100" });
			}
		} else {
			equity_percentage = null;
		}

		const projectResult = await pool.query(
			`SELECT p.project_id, p.startup_id, s.user_id AS startup_user_id
			 FROM projects p
			 JOIN startups s ON s.startup_id = p.startup_id
			 JOIN users u ON u.user_id = s.user_id
			 WHERE p.project_id = $1
			   AND p.status IN ('active', 'funded')
			   AND u.is_active = true
			   AND u.is_approved = true`,
			[projectId],
		);

		if (!projectResult.rowCount) {
			return res.status(404).json({ error: "Discoverable project not found" });
		}

		const project = projectResult.rows[0];
		const result = await pool.query(
			`INSERT INTO investment_requests(
				startup_id,
				investor_id,
				project_id,
				requested_amount,
				proposal_message,
				status
			 )
			 VALUES($1,$2,$3,$4,$5,'pending')
			 RETURNING *`,
			[
				project.startup_id,
				investorId,
				projectId,
				requested_amount,
				proposal_message || null,
			],
		);

		if (equity_percentage !== null) {
			await pool.query(
				`INSERT INTO investments (investment_request_id, amount, equity_percentage, status)
				 VALUES ($1,$2,$3,'pending')
				 ON CONFLICT (investment_request_id)
				 DO UPDATE SET amount = EXCLUDED.amount,
				               equity_percentage = EXCLUDED.equity_percentage,
				               status = 'pending'`,
				[result.rows[0].investment_request_id, requested_amount, equity_percentage],
			);
		}

		await notifyUser(
			project.startup_user_id,
			"investment",
			"New funding offer",
			"An investor sent a funding offer for your project.",
			"investment_requests",
			result.rows[0].investment_request_id,
		);

		return res.status(201).json({
			message: "Investment offer sent",
			investment_request: result.rows[0],
		});
	} catch (err) {
		return res.status(err.status || 500).json({ error: err.message });
	}
};

exports.listInvestmentRequests = async (req, res) => {
	try {
		const { role, user_id: userId } = req.user;
		let condition;
		let actorId;

		if (role === "Investor") {
			actorId = await getInvestorIdByUserId(userId);
			condition = "ir.investor_id = $1";
		} else if (role === "Startup") {
			actorId = await getStartupIdByUserId(userId);
			condition = "ir.startup_id = $1";
		} else {
			return res
				.status(403)
				.json({ error: "Only startups and investors can view requests" });
		}

		if (!actorId) {
			return res.status(404).json({ error: `${role} profile not found` });
		}

		const result = await pool.query(
			`SELECT
				ir.*,
				p.project_title,
				s.startup_name,
				i.organization_name,
				iu.first_name AS investor_first_name,
				iu.last_name AS investor_last_name,
				su.first_name AS startup_first_name,
				su.last_name AS startup_last_name,
				inv.investment_id,
				inv.amount AS offer_amount,
				inv.equity_percentage,
				inv.status AS investment_status
			 FROM investment_requests ir
			 JOIN projects p ON p.project_id = ir.project_id
			 JOIN startups s ON s.startup_id = ir.startup_id
			 JOIN users su ON su.user_id = s.user_id
			 JOIN investors i ON i.investor_id = ir.investor_id
			 JOIN users iu ON iu.user_id = i.user_id
			 LEFT JOIN investments inv ON inv.investment_request_id = ir.investment_request_id
			 WHERE ${condition}
			 ORDER BY ir.created_at DESC`,
			[actorId],
		);

		return res.json({ investment_requests: result.rows });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.respondToInvestmentRequest = async (req, res) => {
	const client = await pool.connect();
	try {
		const requestId = Number(req.params.requestId);
		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).json({ error: "Invalid request id" });
		}

		const { status, comment } = req.body || {};
		const allowed = ["approved", "rejected", "withdrawn"];
		if (!allowed.includes(status)) {
			return res
				.status(400)
				.json({ error: "status must be approved, rejected, or withdrawn" });
		}

		const request = await getInvestmentRequestForActor(requestId, req.user);
		if (request === false) {
			return res.status(403).json({ error: "Not authorized for this request" });
		}
		if (!request) {
			return res.status(404).json({ error: "Investment request not found" });
		}

		if (status === "withdrawn" && req.user.role !== "Investor") {
			return res.status(403).json({ error: "Only the investor can withdraw" });
		}
		if (["approved", "rejected"].includes(status) && req.user.role !== "Startup") {
			return res
				.status(403)
				.json({ error: "Only the startup can approve or reject offers" });
		}
		if (request.status !== "pending") {
			return res
				.status(409)
				.json({ error: "Only pending investment requests can be updated" });
		}

		await client.query("BEGIN");
		const updated = await client.query(
			`UPDATE investment_requests
			 SET status = $1
			 WHERE investment_request_id = $2
			 RETURNING *`,
			[status, requestId],
		);

		if (status === "approved") {
			const existingInvestment = await client.query(
				"SELECT investment_id FROM investments WHERE investment_request_id = $1",
				[requestId],
			);
			if (!existingInvestment.rowCount) {
				await client.query(
					`INSERT INTO investments (investment_request_id, amount, status)
					 VALUES ($1,$2,'pending')`,
					[requestId, request.requested_amount],
				);
			}
		}

		await client.query(
			`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
			 VALUES ($1,$2,'investment_requests',$3,$4)`,
			[
				req.user.user_id,
				`investment_request_${status}`,
				requestId,
				comment || null,
			],
		);

		await client.query("COMMIT");

		const notifyTarget =
			req.user.role === "Startup"
				? request.investor_user_id
				: request.startup_user_id;
		await notifyUser(
			notifyTarget,
			"investment",
			`Investment offer ${status}`,
			comment || `The investment offer was ${status}.`,
			"investment_requests",
			requestId,
		);

		return res.json({
			message: `Investment request ${status}`,
			investment_request: updated.rows[0],
		});
	} catch (err) {
		await client.query("ROLLBACK").catch(() => {});
		return res.status(err.status || 500).json({ error: err.message });
	} finally {
		client.release();
	}
};

exports.recordInvestmentPayment = async (req, res) => {
	const client = await pool.connect();
	try {
		const requestId = Number(req.params.requestId);
		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).json({ error: "Invalid request id" });
		}

		const request = await getInvestmentRequestForActor(requestId, req.user);
		if (request === false) {
			return res.status(403).json({ error: "Not authorized for this request" });
		}
		if (!request) {
			return res.status(404).json({ error: "Investment request not found" });
		}
		if (req.user.role !== "Investor") {
			return res
				.status(403)
				.json({ error: "Only the investor can record investment payments" });
		}
		if (request.status !== "approved") {
			return res
				.status(409)
				.json({ error: "Payment can only be recorded after startup approval" });
		}

		const amount = parsePositiveNumber(req.body.amount || request.requested_amount, "amount");
		const {
			payment_method = "manual",
			currency = "USD",
			status = "completed",
			reference,
		} = req.body || {};
		const allowedStatus = ["pending", "completed", "failed", "refunded"];
		if (!allowedStatus.includes(status)) {
			return res.status(400).json({ error: "Invalid payment status" });
		}

		await client.query("BEGIN");

		const previousInvestment = await client.query(
			"SELECT status, amount FROM investments WHERE investment_request_id = $1",
			[requestId],
		);

		const investment = await client.query(
			`INSERT INTO investments (investment_request_id, amount, status, closed_at)
			 VALUES ($1,$2,$3,CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END)
			 ON CONFLICT (investment_request_id)
			 DO UPDATE SET amount = EXCLUDED.amount,
			               status = EXCLUDED.status,
			               closed_at = EXCLUDED.closed_at
			 RETURNING *`,
			[requestId, amount, status],
		);

		const payment = await client.query(
			`INSERT INTO payments
			 (from_user_id, to_user_id, amount, currency, payment_method, status, reference_type, reference_id)
			 VALUES ($1,$2,$3,$4,$5,$6,'investment_requests',$7)
			 RETURNING *`,
			[
				request.investor_user_id,
				request.startup_user_id,
				amount,
				currency,
				reference || payment_method,
				status,
				requestId,
			],
		);

		const wasAlreadyCompleted =
			previousInvestment.rowCount &&
			previousInvestment.rows[0].status === "completed";

		if (status === "completed" && !wasAlreadyCompleted) {
			await client.query(
				`UPDATE projects
				 SET amount_raised = amount_raised + $1,
				     status = CASE
				       WHEN amount_raised + $1 >= funding_goal THEN 'funded'
				       ELSE status
				     END
				 WHERE project_id = $2`,
				[amount, request.project_id],
			);
		}

		await client.query("COMMIT");

		await notifyUser(
			request.startup_user_id,
			"payment",
			"Investment payment updated",
			`Investment payment status is ${status}.`,
			"payments",
			payment.rows[0].payment_id,
		);

		return res.status(201).json({
			message: "Investment payment recorded",
			investment: investment.rows[0],
			payment: payment.rows[0],
		});
	} catch (err) {
		await client.query("ROLLBACK").catch(() => {});
		return res.status(err.status || 500).json({ error: err.message });
	} finally {
		client.release();
	}
};

exports.listInvestmentPayments = async (req, res) => {
	try {
		const { role, user_id: userId } = req.user;
		const condition =
			role === "Investor"
				? "pay.from_user_id = $1"
				: role === "Startup"
					? "pay.to_user_id = $1"
					: null;
		if (!condition) {
			return res
				.status(403)
				.json({ error: "Only startups and investors can view payments" });
		}

		const result = await pool.query(
			`SELECT pay.*, ir.project_id, p.project_title, s.startup_name, i.organization_name
			 FROM payments pay
			 JOIN investment_requests ir
			   ON ir.investment_request_id = pay.reference_id
			  AND pay.reference_type = 'investment_requests'
			 JOIN projects p ON p.project_id = ir.project_id
			 JOIN startups s ON s.startup_id = ir.startup_id
			 JOIN investors i ON i.investor_id = ir.investor_id
			 WHERE ${condition}
			 ORDER BY pay.created_at DESC`,
			[userId],
		);

		return res.json({ payments: result.rows });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.submitInvestorFeedback = async (req, res) => {
	try {
		const requestId = Number(req.params.requestId);
		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).json({ error: "Invalid request id" });
		}

		const request = await getInvestmentRequestForActor(requestId, req.user);
		if (request === false) {
			return res.status(403).json({ error: "Not authorized for this request" });
		}
		if (!request) {
			return res.status(404).json({ error: "Investment request not found" });
		}
		if (req.user.role !== "Investor") {
			return res
				.status(403)
				.json({ error: "Only investors can submit startup feedback" });
		}

		let { rating, comment } = req.body || {};
		rating = Number(rating);
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
			return res.status(400).json({ error: "rating must be between 1 and 5" });
		}

		const result = await pool.query(
			`INSERT INTO investor_feedback
			 (investment_request_id, startup_id, investor_id, rating, comment)
			 VALUES ($1,$2,$3,$4,$5)
			 ON CONFLICT (investment_request_id, investor_id)
			 DO UPDATE SET rating = EXCLUDED.rating,
			               comment = EXCLUDED.comment,
			               updated_at = NOW()
			 RETURNING *`,
			[
				requestId,
				request.startup_id,
				request.investor_id,
				rating,
				comment || null,
			],
		);

		await notifyUser(
			request.startup_user_id,
			"investment",
			"Investor feedback received",
			"An investor submitted feedback for your startup.",
			"investor_feedback",
			result.rows[0].feedback_id,
		);

		return res.status(201).json({
			message: "Investor feedback saved",
			feedback: result.rows[0],
		});
	} catch (err) {
		return res.status(err.status || 500).json({ error: err.message });
	}
};

exports.listInvestorFeedback = async (req, res) => {
	try {
		const startupId = await getStartupIdByUserId(req.user.user_id);
		if (!startupId) {
			return res.status(404).json({ error: "Startup profile not found" });
		}

		const result = await pool.query(
			`SELECT f.*, i.organization_name, u.first_name, u.last_name
			 FROM investor_feedback f
			 JOIN investors i ON i.investor_id = f.investor_id
			 JOIN users u ON u.user_id = i.user_id
			 WHERE f.startup_id = $1
			 ORDER BY f.created_at DESC`,
			[startupId],
		);

		return res.json({ feedback: result.rows });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};
