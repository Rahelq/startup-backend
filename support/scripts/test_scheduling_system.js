const pool = require("../config/db");
const schedulingService = require("../services/mentorshipSchedulingService");
const reminderService = require("../services/sessionReminderService");

async function getAcceptedPair() {
  const result = await pool.query(
    `SELECT mr.mentorship_request_id, mr.startup_id, mr.mentor_id,
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
  const pair = await getAcceptedPair();
  if (!pair) {
    throw new Error("No accepted mentorship request found for testing");
  }

  const previousAvailability = await schedulingService.getMentorAvailabilityByMentorId(
    pair.mentor_id
  );
  const now = new Date();
  const bookingStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  bookingStart.setUTCMinutes(0, 0, 0);
  const bookingEnd = new Date(bookingStart.getTime() + 45 * 60 * 1000);
  const availabilitySlot = [
    {
      day_of_week: bookingStart.getUTCDay(),
      start_time: "00:00:00",
      end_time: "23:59:59",
    },
  ];

  await schedulingService.updateMentorAvailability(pair.mentor_user_id, availabilitySlot);

  let bookedSession = null;
  let restoredAvailability = false;
  try {
    const booking = await schedulingService.createLinkedSession({
      mentorshipRequestId: pair.mentorship_request_id,
      mentorId: pair.mentor_id,
      startupId: pair.startup_id,
      bookedByUserId: pair.startup_user_id,
      scheduledAt: bookingStart.toISOString(),
      durationMinutes: 45,
      createZoom: false,
    });

    bookedSession = booking.mentorship_session;
    const confirmed = await schedulingService.confirmSession(bookedSession.mentorship_session_id);
    const rescheduled = await schedulingService.rescheduleSession({
      sessionId: bookedSession.mentorship_session_id,
      scheduledAt: new Date(bookingStart.getTime() + 30 * 60 * 1000).toISOString(),
      durationMinutes: 30,
    });

    await pool.query(
      `UPDATE mentorship_sessions
			 SET session_start_at = $1,
			     session_end_at = $2,
			     scheduled_at = $1,
			     reminder_24h_sent_at = NULL,
			     reminder_1h_sent_at = NULL,
			     updated_at = NOW()
			 WHERE mentorship_session_id = $3`,
      [
        new Date(Date.now() + 61 * 60 * 1000).toISOString(),
        new Date(Date.now() + 91 * 60 * 1000).toISOString(),
        bookedSession.mentorship_session_id,
      ]
    );

    const reminderResults = await reminderService.processDueSessionReminders();
    const reminderCheck = await pool.query(
      `SELECT reminder_1h_sent_at, reminder_24h_sent_at
			 FROM mentorship_sessions
			 WHERE mentorship_session_id = $1`,
      [bookedSession.mentorship_session_id]
    );

    const cancelled = await schedulingService.cancelSession(bookedSession.mentorship_session_id);

    console.log(
      JSON.stringify(
        {
          bookedSession,
          confirmed,
          rescheduled,
          reminderResults,
          reminderCheck: reminderCheck.rows[0],
          cancelled,
          bookingWindow: {
            start: bookingStart.toISOString(),
            end: bookingEnd.toISOString(),
          },
        },
        null,
        2
      )
    );
  } finally {
    try {
      if (bookedSession) {
        await schedulingService.cancelSession(bookedSession.mentorship_session_id);
      }
    } catch {}
    try {
      if (previousAvailability) {
        await schedulingService.updateMentorAvailability(
          pair.mentor_user_id,
          previousAvailability.availability || []
        );
      }
      restoredAvailability = true;
    } catch {}
  }

  if (!restoredAvailability) {
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
