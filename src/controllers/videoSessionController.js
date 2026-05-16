const videoSessionService = require("../services/videoSessionService");
const realtimeEmitter = require("../utils/realtimeEmitter");

function assertParticipantAccess(session, userId) {
	if (session.host_id !== userId && session.participant_id !== userId) {
		const error = new Error("Access denied");
		error.statusCode = 403;
		throw error;
	}
}

// Create a new session
exports.create = async (req, res) => {
	try {
		const host_id = req.body.host_id || req.user.user_id;
		const participant_id = req.body.participant_id;
		if (!participant_id)
			return res.status(400).json({ message: "participant_id required" });

		// simple access: host must be the authenticated user
		if (host_id !== req.user.user_id)
			return res
				.status(403)
				.json({ message: "You must be the host to create a session as host" });

		const scheduled_at = req.body.scheduled_at;
		const duration = req.body.duration || 60; 

		const session = await videoSessionService.createSession({
			host_id,
			participant_id,
			scheduled_at,
			duration,
			topic: req.body.topic,
			create_zoom: true,
		});

		// Emit real-time video session created event
		realtimeEmitter.emitVideoSessionStarted(
			session.id,
			[host_id, participant_id],
			session.zoom_meeting_url,
		);

		res.status(201).json(session);
	} catch (err) {
		res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.get = async (req, res) => {
	try {
		const id = Number(req.params.id);
		const s = await videoSessionService.getSessionById(id);
		if (!s) return res.status(404).json({ message: "Session not found" });
		assertParticipantAccess(s, req.user.user_id);
		res.json(s);
	} catch (err) {
		res.status(err.statusCode || 500).json({ error: err.message });
	}
};

exports.listForUser = async (req, res) => {
	try {
		const u = req.user.user_id;
		const items = await videoSessionService.listSessionsForUser(u);
		res.json(items);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.reschedule = async (req, res) => {
	try {
		const id = Number(req.params.id);
		const s = await videoSessionService.getSessionById(id);
		if (!s) return res.status(404).json({ message: "Session not found" });

		// only host can reschedule
		if (s.host_id !== req.user.user_id)
			return res.status(403).json({ message: "Only host can reschedule" });

		const updates = {
			scheduled_at: req.body.scheduled_at,
			duration: req.body.duration,
			topic: req.body.topic,
		};
		const updated = await videoSessionService.updateSession(id, updates);

		// Emit real-time reschedule event
		realtimeEmitter.emitVideoSessionRescheduled(id, updated.scheduled_at, [
			s.host_id,
			s.participant_id,
		]);

		res.json(updated);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.cancel = async (req, res) => {
	try {
		const id = Number(req.params.id);
		const s = await videoSessionService.getSessionById(id);
		if (!s) return res.status(404).json({ message: "Session not found" });

		// only host can cancel
		if (s.host_id !== req.user.user_id)
			return res.status(403).json({ message: "Only host can cancel" });

		const cancelled = await videoSessionService.cancelSession(id);

		// Emit real-time video session ended event
		realtimeEmitter.emitVideoSessionEnded(id, [s.host_id, s.participant_id], 0);

		res.json(cancelled);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.join = async (req, res) => {
	try {
		const id = Number(req.params.id);
		const s = await videoSessionService.getSessionById(id);
		if (!s) return res.status(404).json({ message: "Session not found" });

		assertParticipantAccess(s, req.user.user_id);

		if (!s.meeting_link) {
			return res.status(400).json({ message: "No meeting link available" });
		}

		// Emit real-time participant joined event
		const otherUserId =
			s.host_id === req.user.user_id ? s.participant_id : s.host_id;
		realtimeEmitter.emitVideoParticipantJoined(id, req.user.user_id, [
			otherUserId,
		]);

		res.json({
			meeting_link: s.meeting_link,
			meeting_id: s.meeting_id,
			provider: s.provider,
			conversation_id: s.conversation_id,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.zoomWebhook = async (req, res) => {
	try {
		if (!videoSessionService.verifyZoomWebhookSignature(req)) {
			return res
				.status(401)
				.json({ message: "Invalid Zoom webhook signature" });
		}

		const eventName = req.body && req.body.event;
		if (!eventName) return res.status(400).json({ message: "Missing event" });

		if (eventName === "endpoint.url_validation") {
			const plainToken = req.body.payload && req.body.payload.plainToken;
			if (!plainToken) {
				return res.status(400).json({ message: "Missing plainToken" });
			}
			const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "";
			const crypto = require("crypto");
			const encryptedToken = crypto
				.createHmac("sha256", secretToken)
				.update(plainToken)
				.digest("hex");
			return res.json({ plainToken, encryptedToken });
		}

		const updated = await videoSessionService.handleZoomWebhookEvent(
			eventName,
			req.body,
		);
		return res.json({ ok: true, session: updated || null });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};
