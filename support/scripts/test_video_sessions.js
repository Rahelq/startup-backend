const pool = require("../config/db");
const service = require("../../src/services/videoSessionService");

async function getAcceptedMentorshipPair() {
  const result = await pool.query(
    `SELECT mr.mentorship_request_id,
            mr.startup_id,
            mr.mentor_id,
            m.user_id AS mentor_user_id,
            s.user_id AS startup_user_id
     FROM mentorship_requests mr
     JOIN mentors m ON m.mentor_id = mr.mentor_id
     JOIN startups s ON s.startup_id = mr.startup_id
     WHERE mr.status = 'accepted'
     ORDER BY mr.created_at DESC
     LIMIT 1`
  );
  return result.rowCount ? result.rows[0] : null;
}

async function main() {
  const pair =
    process.env.VIDEO_SESSION_HOST_ID && process.env.VIDEO_SESSION_PARTICIPANT_ID
      ? {
          hostId: Number(process.env.VIDEO_SESSION_HOST_ID),
          participantId: Number(process.env.VIDEO_SESSION_PARTICIPANT_ID),
        }
      : await getAcceptedMentorshipPair();
  if (!pair) {
    throw new Error("No accepted mentorship relationship found for video session testing");
  }
  const hostId = Number(pair.mentor_user_id || pair.hostId);
  const participantId = Number(pair.startup_user_id || pair.participantId);
  const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const zoomEnabled = process.env.ZOOM_ENABLED === "true";
  const zoomConfigured = Boolean(
    process.env.ZOOM_ACCESS_TOKEN ||
    process.env.ZOOM_JWT_TOKEN ||
    (process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET)
  );

  const session = await service.createSession({
    host_id: hostId,
    participant_id: participantId,
    scheduled_at: start,
    duration: 45,
    create_zoom: false,
  });

  const lastCreate = await pool.query(
    "SELECT message_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, message_id DESC LIMIT 1",
    [session.conversation_id]
  );

  const updated = await service.updateSession(session.id, {
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    duration: 50,
  });

  const lastUpdate = await pool.query(
    "SELECT message_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, message_id DESC LIMIT 1",
    [session.conversation_id]
  );

  const cancelled = await service.cancelSession(session.id);

  const lastCancel = await pool.query(
    "SELECT message_type, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, message_id DESC LIMIT 1",
    [session.conversation_id]
  );

  const secret = "webhook-secret";
  process.env.ZOOM_WEBHOOK_SECRET_TOKEN = secret;
  const body = '{"event":"meeting.started","payload":{"object":{"id":"12345"}}}';
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

  let zoomStatus = zoomEnabled
    ? zoomConfigured
      ? "enabled_pending_test"
      : "enabled_but_missing_credentials"
    : "disabled";

  let zoomSessionSummary = null;
  if (zoomEnabled && zoomConfigured) {
    try {
      const zoomSession = await service.createSession({
        host_id: hostId,
        participant_id: participantId,
        scheduled_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        duration: 30,
        create_zoom: true,
      });
      zoomSessionSummary = {
        id: zoomSession.id,
        provider: zoomSession.provider,
        meeting_link: zoomSession.meeting_link,
        meeting_id: zoomSession.meeting_id,
      };
      zoomStatus = zoomSession.provider === "zoom" ? "enabled_and_created" : "enabled_but_not_zoom";
      try {
        await service.cancelSession(zoomSession.id);
      } catch (cancelError) {
        zoomStatus = `${zoomStatus}_cancel_warning`;
      }
    } catch (zoomError) {
      zoomStatus = `enabled_error_${zoomError.message}`;
    }
  }

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
        zoomStatus,
        zoomSessionSummary,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
