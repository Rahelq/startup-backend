const axios = require("axios");
const crypto = require("crypto");
const pool = require("../config/db");
const chatService = require("./chatService");

const ZOOM_API_BASE = "https://api.zoom.us/v2";
const ZOOM_OAUTH_BASE = "https://zoom.us/oauth/token";

let cachedZoomToken = null;
let cachedZoomTokenExpiresAt = 0;

function isZoomEnabled() {
	return process.env.ZOOM_ENABLED === "true";
}

function zoomTopic(hostId, participantId, scheduledAt) {
	const when = scheduledAt
		? new Date(scheduledAt).toISOString()
		: "unscheduled";
	return `Video Session ${hostId} → ${participantId} @ ${when}`;
}

function zoomConfig() {
	return {
		accessToken: process.env.ZOOM_ACCESS_TOKEN || null,
		jwtToken: process.env.ZOOM_JWT_TOKEN || null,
		accountId: process.env.ZOOM_ACCOUNT_ID || null,
		clientId: process.env.ZOOM_CLIENT_ID || null,
		clientSecret: process.env.ZOOM_CLIENT_SECRET || null,
		userId: process.env.ZOOM_USER_ID || "me",
		webhookSecret: process.env.ZOOM_WEBHOOK_SECRET_TOKEN || null,
	};
}

async function getZoomAccessToken() {
	const config = zoomConfig();
	if (config.accessToken) return config.accessToken;
	if (config.jwtToken) return config.jwtToken;
	if (cachedZoomToken && Date.now() < cachedZoomTokenExpiresAt) {
		return cachedZoomToken;
	}
	if (!config.accountId || !config.clientId || !config.clientSecret) {
		throw new Error(
			"Zoom credentials missing. Set ZOOM_ACCESS_TOKEN or ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET",
		);
	}
	const auth = Buffer.from(
		`${config.clientId}:${config.clientSecret}`,
	).toString("base64");
	const response = await axios.post(
		`${ZOOM_OAUTH_BASE}?grant_type=account_credentials&account_id=${encodeURIComponent(config.accountId)}`,
		null,
		{
			headers: {
				Authorization: `Basic ${auth}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
		},
	);
	cachedZoomToken = response.data.access_token;
	cachedZoomTokenExpiresAt =
		Date.now() + ((response.data.expires_in || 3600) - 60) * 1000;
	return cachedZoomToken;
}

async function zoomRequest(method, path, data) {
	if (!isZoomEnabled()) return null;
	const token = await getZoomAccessToken();
	const response = await axios({
		method,
		url: `${ZOOM_API_BASE}${path}`,
		data,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});
	return response.data;
}

async function createZoomMeeting({ topic, start_time, duration }) {
	if (!isZoomEnabled()) return null;
	const zoomBody = {
		topic: topic || "Video Session",
		type: 2,
		start_time: new Date(start_time).toISOString(),
		duration: duration || 60,
		settings: {
			join_before_host: true,
			audio: "both",
		},
	};
	const config = zoomConfig();
	const data = await zoomRequest(
		"post",
		`/users/${encodeURIComponent(config.userId)}/meetings`,
		zoomBody,
	);
	if (!data) return null;
	return {
		meeting_link: data.join_url || data.html_link || null,
		meeting_id: String(data.id || ""),
		raw: data,
	};
}

async function updateZoomMeeting(meetingId, { topic, start_time, duration }) {
	if (!isZoomEnabled() || !meetingId) return null;
	const zoomBody = {};
	if (topic) zoomBody.topic = topic;
	if (start_time) zoomBody.start_time = new Date(start_time).toISOString();
	if (duration) zoomBody.duration = duration;
	const data = await zoomRequest(
		"patch",
		`/meetings/${encodeURIComponent(meetingId)}`,
		zoomBody,
	);
	return data;
}

async function deleteZoomMeeting(meetingId) {
	if (!isZoomEnabled() || !meetingId) return null;
	return zoomRequest("delete", `/meetings/${encodeURIComponent(meetingId)}`);
}

async function createConversationIfNeeded(host_id, participant_id) {
	return chatService.createConversation(host_id, participant_id);
}

async function createSessionSystemMessage({
	conversationId,
	host_id,
	participant_id,
	body,
}) {
	if (!conversationId) return null;
	return chatService.sendMessage({
		conversationId,
		senderId: host_id,
		receiverId: participant_id,
		message: body,
		messageType: "system",
	});
}

async function postSessionEventMessage(session, body) {
	if (!session || !session.conversation_id) return null;
	return createSessionSystemMessage({
		conversationId: session.conversation_id,
		host_id: session.host_id,
		participant_id: session.participant_id,
		body,
	});
}

async function createSession({
	host_id,
	participant_id,
	scheduled_at,
	duration,
	topic,
	conversation_id,
	create_zoom = true,
}) {
	const conversation = conversation_id
		? typeof conversation_id === "object" && conversation_id.conversation_id
			? conversation_id
			: { conversation_id }
		: await createConversationIfNeeded(host_id, participant_id);
	if (!conversation || !conversation.conversation_id) {
		throw new Error("Unable to create or access the session conversation");
	}

	let meeting_link = null;
	let meeting_id = null;
	let provider = null;

	if (create_zoom && isZoomEnabled()) {
		const m = await createZoomMeeting({
			topic: topic || zoomTopic(host_id, participant_id, scheduled_at),
			start_time: scheduled_at,
			duration,
		});
		if (m) {
			meeting_link = m.meeting_link;
			meeting_id = m.meeting_id;
			provider = "zoom";
		}
	}

	const result = await pool.query(
		`INSERT INTO video_sessions (
			host_id,
			participant_id,
			conversation_id,
			meeting_link,
			meeting_id,
			provider,
			scheduled_at,
			duration,
			status,
			created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING *`,
		[
			host_id,
			participant_id,
			conversation.conversation_id,
			meeting_link,
			meeting_id,
			provider,
			scheduled_at,
			duration || 60,
			"pending",
		],
	);

	const session = result.rows[0];
	const chatMessage = `Video session scheduled for ${new Date(
		scheduled_at,
	).toLocaleString()}. Join from the session details or the link when available.`;
	await postSessionEventMessage(session, chatMessage);

	return session;
}

async function getSessionById(id) {
	const r = await pool.query("SELECT * FROM video_sessions WHERE id = $1", [
		id,
	]);
	return r.rows[0] || null;
}

async function listSessionsForUser(userId) {
	const r = await pool.query(
		"SELECT * FROM video_sessions WHERE host_id = $1 OR participant_id = $1 ORDER BY scheduled_at DESC",
		[userId],
	);
	return r.rows;
}

async function updateSession(id, { scheduled_at, duration, status, topic }) {
	const current = await getSessionById(id);
	if (!current) throw new Error("Session not found");

	const newScheduled = scheduled_at || current.scheduled_at;
	const newDuration = duration || current.duration;
	const newStatus = status || current.status;
	const newTopic =
		topic || zoomTopic(current.host_id, current.participant_id, newScheduled);

	if (current.provider === "zoom" && current.meeting_id) {
		await updateZoomMeeting(current.meeting_id, {
			topic: newTopic,
			start_time: newScheduled,
			duration: newDuration,
		});
	}

	const r = await pool.query(
		"UPDATE video_sessions SET scheduled_at = $1, duration = $2, status = $3 WHERE id = $4 RETURNING *",
		[newScheduled, newDuration, newStatus, id],
	);
	const updated = r.rows[0];
	if (updated) {
		await postSessionEventMessage(
			updated,
			`Video session rescheduled to ${new Date(
				updated.scheduled_at,
			).toLocaleString()}.`,
		);
	}
	return updated;
}

async function cancelSession(id) {
	const current = await getSessionById(id);
	if (!current) throw new Error("Session not found");
	if (current.provider === "zoom" && current.meeting_id) {
		await deleteZoomMeeting(current.meeting_id);
	}
	const r = await pool.query(
		"UPDATE video_sessions SET status = $1 WHERE id = $2 RETURNING *",
		["cancelled", id],
	);
	const cancelled = r.rows[0];
	if (cancelled) {
		await postSessionEventMessage(cancelled, "Video session cancelled.");
	}
	return cancelled;
}

function verifyZoomWebhookSignature(req) {
	const config = zoomConfig();
	if (!config.webhookSecret) return true;
	const timestamp = req.headers["x-zm-request-timestamp"];
	const signature = req.headers["x-zm-signature"];
	if (!timestamp || !signature || !req.rawBody) return false;
	const hash = crypto
		.createHmac("sha256", config.webhookSecret)
		.update(`v0:${timestamp}:${req.rawBody}`)
		.digest("hex");
	const expected = `v0=${hash}`;
	const expectedBuffer = Buffer.from(expected);
	const signatureBuffer = Buffer.from(signature);
	if (expectedBuffer.length !== signatureBuffer.length) return false;
	return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function handleZoomWebhookEvent(eventName, payload) {
	const meetingId = String(
		payload &&
			(payload.payload?.object?.id ||
				payload.object?.id ||
				payload.meeting_id ||
				""),
	);
	if (!meetingId) return null;
	const current = await pool.query(
		"SELECT * FROM video_sessions WHERE meeting_id = $1 LIMIT 1",
		[meetingId],
	);
	if (!current.rowCount) return null;
	const session = current.rows[0];
	let status = session.status;
	if (eventName === "meeting.started") {
		status = "active";
	}
	if (eventName === "meeting.ended" || eventName === "meeting.completed") {
		status = "completed";
	}
	const updated = await pool.query(
		"UPDATE video_sessions SET status = $1 WHERE id = $2 RETURNING *",
		[status, session.id],
	);
	const nextSession = updated.rows[0];
	if (nextSession && status !== session.status) {
		const message =
			status === "active"
				? "Zoom meeting started."
				: status === "completed"
					? "Zoom meeting completed."
					: null;
		if (message) {
			await postSessionEventMessage(nextSession, message);
		}
	}
	return nextSession;
}

module.exports = {
	createSession,
	getSessionById,
	listSessionsForUser,
	updateSession,
	cancelSession,
	createZoomMeeting,
	updateZoomMeeting,
	deleteZoomMeeting,
	handleZoomWebhookEvent,
	verifyZoomWebhookSignature,
};
