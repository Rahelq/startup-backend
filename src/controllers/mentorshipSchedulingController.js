const pool = require("../config/db");
const schedulingService = require("../services/mentorshipSchedulingService");

async function getStartupIdByUserId(userId) {
	const result = await pool.query(
		"SELECT startup_id FROM startups WHERE user_id = $1",
		[userId],
	);
	return result.rowCount ? result.rows[0].startup_id : null;
}

async function getMentorIdByUserId(userId) {
	const result = await pool.query(
		"SELECT mentor_id FROM mentors WHERE user_id = $1",
		[userId],
	);
	return result.rowCount ? result.rows[0].mentor_id : null;
}

async function getMentorUserIdByMentorId(mentorId) {
	const result = await pool.query(
		"SELECT user_id FROM mentors WHERE mentor_id = $1",
		[mentorId],
	);
	return result.rowCount ? result.rows[0].user_id : null;
}

async function getStartupUserIdByStartupId(startupId) {
	const result = await pool.query(
		"SELECT user_id FROM startups WHERE startup_id = $1",
		[startupId],
	);
	return result.rowCount ? result.rows[0].user_id : null;
}

async function getSessionOwnership(sessionId) {
	const result = await pool.query(
		`SELECT ms.mentorship_session_id, ms.startup_id, ms.mentor_id
		 FROM mentorship_sessions ms
		 WHERE ms.mentorship_session_id = $1`,
		[sessionId],
	);
	return result.rowCount ? result.rows[0] : null;
}

function ensureSessionAccess(session, userId) {
	return Boolean(
		session &&
		session.allowedUserIds &&
		session.allowedUserIds.includes(userId),
	);
}

async function attachAllowedUserIds(session) {
	if (!session) return null;
	const mentorUserId = await getMentorUserIdByMentorId(session.mentor_id);
	const startupUserId = await getStartupUserIdByStartupId(session.startup_id);
	return {
		...session,
		allowedUserIds: [mentorUserId, startupUserId].filter(Boolean),
	};
}

exports.getMyAvailability = async (req, res) => {
	try {
		const mentorId = await getMentorIdByUserId(req.user.user_id);
		if (!mentorId) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}
		const availability =
			await schedulingService.getMentorAvailabilityByMentorId(mentorId);
		return res.json(availability);
	} catch (err) {
		return res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.getMentorAvailability = async (req, res) => {
	try {
		const mentorId = Number(req.params.mentorId);
		if (!Number.isInteger(mentorId) || mentorId <= 0) {
			return res.status(400).json({ error: "Invalid mentor id" });
		}
		const availability =
			await schedulingService.getMentorAvailabilityByMentorId(mentorId);
		if (!availability) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}
		return res.json(availability);
	} catch (err) {
		return res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.updateMyAvailability = async (req, res) => {
	try {
		const updated = await schedulingService.updateMentorAvailability(
			req.user.user_id,
			req.body && req.body.availability,
		);
		return res.json(updated);
	} catch (err) {
		return res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.bookSession = async (req, res) => {
	try {
		const startupId = await getStartupIdByUserId(req.user.user_id);
		if (!startupId) {
			return res.status(404).json({ error: "Startup profile not found" });
		}

		const mentorshipRequestId = Number(req.body.mentorship_request_id);
		const mentorId = Number(req.body.mentor_id);
		if (!Number.isInteger(mentorshipRequestId) || mentorshipRequestId <= 0) {
			return res
				.status(400)
				.json({ error: "Valid mentorship_request_id is required" });
		}
		if (!Number.isInteger(mentorId) || mentorId <= 0) {
			return res.status(400).json({ error: "Valid mentor_id is required" });
		}
		if (!req.body.scheduled_at) {
			return res.status(400).json({ error: "scheduled_at is required" });
		}

		const created = await schedulingService.createLinkedSession({
			mentorshipRequestId,
			mentorId,
			startupId,
			bookedByUserId: req.user.user_id,
			scheduledAt: req.body.scheduled_at,
			durationMinutes: req.body.duration_minutes || req.body.duration || 60,
			topic: req.body.topic,
			createZoom: req.body.create_zoom !== false,
		});

		return res.status(201).json(created);
	} catch (err) {
		return res.status(err.statusCode || 500).json({
			error: err.message,
			details: err.details || undefined,
		});
	}
};

exports.confirmSession = async (req, res) => {
	try {
		const mentorId = await getMentorIdByUserId(req.user.user_id);
		if (!mentorId) {
			return res.status(404).json({ error: "Mentor profile not found" });
		}

		const sessionId = Number(req.params.sessionId);
		if (!Number.isInteger(sessionId) || sessionId <= 0) {
			return res.status(400).json({ error: "Invalid session id" });
		}

		const session = await attachAllowedUserIds(
			await getSessionOwnership(sessionId),
		);
		if (!session || session.mentor_id !== mentorId) {
			return res.status(404).json({ error: "Mentorship session not found" });
		}

		const updated = await schedulingService.confirmSession(sessionId);
		return res.json(updated);
	} catch (err) {
		return res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.rescheduleSession = async (req, res) => {
	try {
		const sessionId = Number(req.params.sessionId);
		if (!Number.isInteger(sessionId) || sessionId <= 0) {
			return res.status(400).json({ error: "Invalid session id" });
		}

		const session = await attachAllowedUserIds(
			await getSessionOwnership(sessionId),
		);
		if (!session || !ensureSessionAccess(session, req.user.user_id)) {
			return res.status(404).json({ error: "Mentorship session not found" });
		}

		const updated = await schedulingService.rescheduleSession({
			sessionId,
			scheduledAt: req.body.scheduled_at,
			durationMinutes: req.body.duration_minutes || req.body.duration,
		});
		return res.json(updated);
	} catch (err) {
		return res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.cancelSession = async (req, res) => {
	try {
		const sessionId = Number(req.params.sessionId);
		if (!Number.isInteger(sessionId) || sessionId <= 0) {
			return res.status(400).json({ error: "Invalid session id" });
		}

		const session = await attachAllowedUserIds(
			await getSessionOwnership(sessionId),
		);
		if (!session || !ensureSessionAccess(session, req.user.user_id)) {
			return res.status(404).json({ error: "Mentorship session not found" });
		}

		const cancelled = await schedulingService.cancelSession(sessionId);
		return res.json(cancelled);
	} catch (err) {
		return res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.listSessions = async (req, res) => {
	try {
		const sessions = await schedulingService.listSessionsForUser(
			req.user.user_id,
		);
		return res.json(sessions);
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};
