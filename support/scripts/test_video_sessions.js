const pool = require("../config/db");
const service = require("../services/videoSessionService");

async function main() {
	const hostId = Number(process.env.VIDEO_SESSION_HOST_ID || 2);
	const participantId = Number(process.env.VIDEO_SESSION_PARTICIPANT_ID || 4);
	const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();

	const session = await service.createSession({
		host_id: hostId,
		participant_id: participantId,
		scheduled_at: start,
		duration: 45,
		create_zoom: false,
	});

	const lastCreate = await pool.query(
		"SELECT message_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, message_id DESC LIMIT 1",
		[session.conversation_id],
	);

	const updated = await service.updateSession(session.id, {
		scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
		duration: 50,
	});

	const lastUpdate = await pool.query(
		"SELECT message_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, message_id DESC LIMIT 1",
		[session.conversation_id],
	);

	const cancelled = await service.cancelSession(session.id);

	const lastCancel = await pool.query(
		"SELECT message_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, message_id DESC LIMIT 1",
		[session.conversation_id],
	);

	const secret = "webhook-secret";
	process.env.ZOOM_WEBHOOK_SECRET_TOKEN = secret;
	const body =
		'{"event":"meeting.started","payload":{"object":{"id":"12345"}}}';
	const signature = require("crypto")
		.createHmac("sha256", secret)
		.update(`v0:123:${body}`)
		.digest("hex");
	const signatureOk = service.verifyZoomWebhookSignature({
		headers: {
			"x-zm-request-timestamp": "123",
			"x-zm-signature": `v0=${signature}`,
		},
		rawBody: body,
	});

	console.log(
		JSON.stringify(
			{
				session,
				lastCreate: lastCreate.rows[0],
				updated,
				lastUpdate: lastUpdate.rows[0],
				cancelled,
				lastCancel: lastCancel.rows[0],
				signatureOk,
			},
			null,
			2,
		),
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
