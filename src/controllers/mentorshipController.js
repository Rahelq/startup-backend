const pool = require("../config/db");

async function getStartupIdByUserId(userId) {
	const startupResult = await pool.query(
		"SELECT startup_id FROM startups WHERE user_id = $1",
		[userId],
	);

	if (startupResult.rowCount === 0) {
		return null;
	}

	return startupResult.rows[0].startup_id;
}

async function getMentorIdByUserId(userId) {
	const mentorResult = await pool.query(
		"SELECT mentor_id FROM mentors WHERE user_id = $1",
		[userId],
	);

	if (mentorResult.rowCount === 0) {
		return null;
	}

	return mentorResult.rows[0].mentor_id;
}

exports.createMentorshipRequest = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const startupId = await getStartupIdByUserId(userId);

		if (!startupId) {
			return res.status(404).json({ error: "Startup profile not found" });
		}

		let { mentor_id, subject, message } = req.body || {};

		if (!mentor_id) {
			return res.status(400).json({ error: "'mentor_id' is required" });
		}

		const mentorId = Number(mentor_id);
		if (!Number.isInteger(mentorId) || mentorId <= 0) {
			return res
				.status(400)
				.json({ error: "'mentor_id' must be a valid integer" });
		}

		if (!subject || typeof subject !== "string" || subject.trim() === "") {
			return res.status(400).json({ error: "'subject' is required" });
		}

		const mentorExists = await pool.query(
			"SELECT mentor_id FROM mentors WHERE mentor_id = $1",
			[mentorId],
		);

		if (mentorExists.rowCount === 0) {
			return res.status(404).json({ error: "Mentor not found" });
		}

		const result = await pool.query(
			`INSERT INTO mentorship_requests (startup_id, mentor_id, subject, message, status)
       VALUES ($1,$2,$3,$4,'pending')
       RETURNING *`,
			[startupId, mentorId, subject.trim(), message || null],
		);

		return res.status(201).json({
			message: "Mentorship request created",
			mentorship_request: result.rows[0],
		});
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.getStartupMentorshipRequests = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const startupId = await getStartupIdByUserId(userId);

		if (!startupId) {
			return res.status(404).json({ error: "Startup profile not found" });
		}

		const result = await pool.query(
			`SELECT
         mr.*,
         m.headline,
         m.expertise,
         m.country,
         u.first_name AS mentor_first_name,
         u.last_name AS mentor_last_name,
         u.email AS mentor_email
       FROM mentorship_requests mr
       JOIN mentors m ON m.mentor_id = mr.mentor_id
       JOIN users u ON u.user_id = m.user_id
       WHERE mr.startup_id = $1
       ORDER BY mr.created_at DESC`,
			[startupId],
		);

		return res.status(200).json(result.rows);
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.getMentorIncomingRequests = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const mentorId = await getMentorIdByUserId(userId);

		if (!mentorId) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}

		const result = await pool.query(
			`SELECT
         mr.*,
         s.startup_name,
         s.industry,
         s.website,
         u.first_name AS startup_owner_first_name,
         u.last_name AS startup_owner_last_name,
         u.email AS startup_owner_email
       FROM mentorship_requests mr
       JOIN startups s ON s.startup_id = mr.startup_id
       JOIN users u ON u.user_id = s.user_id
       WHERE mr.mentor_id = $1
       ORDER BY mr.created_at DESC`,
			[mentorId],
		);

		return res.status(200).json(result.rows);
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.respondToMentorshipRequest = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const mentorId = await getMentorIdByUserId(userId);

		if (!mentorId) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}

		const requestId = Number(req.params.requestId);
		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).json({ error: "Invalid request id" });
		}

		const { status } = req.body || {};
		const allowedStatuses = ["accepted", "rejected"];

		if (!allowedStatuses.includes(status)) {
			return res.status(400).json({
				error: "'status' must be either 'accepted' or 'rejected'",
			});
		}

		const requestResult = await pool.query(
			`SELECT mentorship_request_id, status
       FROM mentorship_requests
       WHERE mentorship_request_id = $1 AND mentor_id = $2`,
			[requestId, mentorId],
		);

		if (requestResult.rowCount === 0) {
			return res.status(404).json({ error: "Mentorship request not found" });
		}

		if (requestResult.rows[0].status !== "pending") {
			return res.status(409).json({
				error: "Only pending requests can be responded to",
			});
		}

		const updateResult = await pool.query(
			`UPDATE mentorship_requests
       SET status = $1
       WHERE mentorship_request_id = $2
       RETURNING *`,
			[status, requestId],
		);

		return res.status(200).json({
			message: `Mentorship request ${status}`,
			mentorship_request: updateResult.rows[0],
		});
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.scheduleMentorshipSession = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const mentorId = await getMentorIdByUserId(userId);

		if (!mentorId) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}

		const {
			mentorship_request_id,
			scheduled_at,
			duration_minutes,
			meeting_link,
			notes,
		} = req.body || {};

		const requestId = Number(mentorship_request_id);
		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).json({
				error: "'mentorship_request_id' must be a valid integer",
			});
		}

		if (!scheduled_at) {
			return res.status(400).json({ error: "'scheduled_at' is required" });
		}

		const when = new Date(scheduled_at);
		if (Number.isNaN(when.getTime())) {
			return res
				.status(400)
				.json({ error: "'scheduled_at' must be a valid datetime" });
		}

		const duration = Number(duration_minutes);
		if (!Number.isInteger(duration) || duration <= 0) {
			return res.status(400).json({
				error: "'duration_minutes' must be a positive integer",
			});
		}

		const requestResult = await pool.query(
			`SELECT mentorship_request_id, status
       FROM mentorship_requests
       WHERE mentorship_request_id = $1 AND mentor_id = $2`,
			[requestId, mentorId],
		);

		if (requestResult.rowCount === 0) {
			return res.status(404).json({ error: "Mentorship request not found" });
		}

		if (requestResult.rows[0].status !== "accepted") {
			return res.status(409).json({
				error: "Session can only be scheduled for accepted mentorship requests",
			});
		}

		const insertResult = await pool.query(
			`INSERT INTO mentorship_sessions
       (mentorship_request_id, scheduled_at, duration_minutes, meeting_link, notes, status)
       VALUES ($1,$2,$3,$4,$5,'scheduled')
       RETURNING *`,
			[
				requestId,
				when.toISOString(),
				duration,
				meeting_link || null,
				notes || null,
			],
		);

		return res.status(201).json({
			message: "Mentorship session scheduled",
			mentorship_session: insertResult.rows[0],
		});
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.updateMentorshipSessionStatus = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const mentorId = await getMentorIdByUserId(userId);

		if (!mentorId) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}

		const sessionId = Number(req.params.sessionId);
		if (!Number.isInteger(sessionId) || sessionId <= 0) {
			return res.status(400).json({ error: "Invalid session id" });
		}

		const { status, notes, meeting_link } = req.body || {};
		const allowedStatuses = ["scheduled", "completed", "cancelled", "no_show"];

		if (!allowedStatuses.includes(status)) {
			return res.status(400).json({
				error:
					"'status' must be one of: scheduled, completed, cancelled, no_show",
			});
		}

		const ownershipCheck = await pool.query(
			`SELECT ms.mentorship_session_id
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       WHERE ms.mentorship_session_id = $1 AND mr.mentor_id = $2`,
			[sessionId, mentorId],
		);

		if (ownershipCheck.rowCount === 0) {
			return res.status(404).json({ error: "Mentorship session not found" });
		}

		const updateResult = await pool.query(
			`UPDATE mentorship_sessions
       SET status = $1,
           notes = COALESCE($2, notes),
           meeting_link = COALESCE($3, meeting_link)
       WHERE mentorship_session_id = $4
       RETURNING *`,
			[status, notes || null, meeting_link || null, sessionId],
		);

		return res.status(200).json({
			message: "Mentorship session updated",
			mentorship_session: updateResult.rows[0],
		});
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.getMentorshipHistory = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const role = req.user.role;

		if (role === "Startup") {
			const startupId = await getStartupIdByUserId(userId);

			if (!startupId) {
				return res.status(404).json({ error: "Startup profile not found" });
			}

			const requests = await pool.query(
				`SELECT
           mr.*,
           m.headline,
           u.first_name AS mentor_first_name,
           u.last_name AS mentor_last_name,
           u.email AS mentor_email
         FROM mentorship_requests mr
         JOIN mentors m ON m.mentor_id = mr.mentor_id
         JOIN users u ON u.user_id = m.user_id
         WHERE mr.startup_id = $1
         ORDER BY mr.created_at DESC`,
				[startupId],
			);

			const sessions = await pool.query(
				`SELECT
           ms.*,
           mr.startup_id,
           mr.mentor_id,
           u.first_name AS mentor_first_name,
           u.last_name AS mentor_last_name,
           u.email AS mentor_email
         FROM mentorship_sessions ms
         JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
         JOIN mentors m ON m.mentor_id = mr.mentor_id
         JOIN users u ON u.user_id = m.user_id
         WHERE mr.startup_id = $1
         ORDER BY ms.scheduled_at DESC`,
				[startupId],
			);

			return res.status(200).json({
				role: "Startup",
				mentorship_requests: requests.rows,
				mentorship_sessions: sessions.rows,
			});
		}

		if (role === "Mentor") {
			const mentorId = await getMentorIdByUserId(userId);

			if (!mentorId) {
				return res.status(404).json({ error: "Mentor profile not found" });
			}

			const requests = await pool.query(
				`SELECT
           mr.*,
           s.startup_name,
           u.first_name AS startup_owner_first_name,
           u.last_name AS startup_owner_last_name,
           u.email AS startup_owner_email
         FROM mentorship_requests mr
         JOIN startups s ON s.startup_id = mr.startup_id
         JOIN users u ON u.user_id = s.user_id
         WHERE mr.mentor_id = $1
         ORDER BY mr.created_at DESC`,
				[mentorId],
			);

			const sessions = await pool.query(
				`SELECT
           ms.*,
           mr.startup_id,
           mr.mentor_id,
           s.startup_name,
           u.first_name AS startup_owner_first_name,
           u.last_name AS startup_owner_last_name,
           u.email AS startup_owner_email
         FROM mentorship_sessions ms
         JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
         JOIN startups s ON s.startup_id = mr.startup_id
         JOIN users u ON u.user_id = s.user_id
         WHERE mr.mentor_id = $1
         ORDER BY ms.scheduled_at DESC`,
				[mentorId],
			);

			return res.status(200).json({
				role: "Mentor",
				mentorship_requests: requests.rows,
				mentorship_sessions: sessions.rows,
			});
		}

		return res.status(403).json({
			error: "Only Startup and Mentor roles can access mentorship history",
		});
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};
