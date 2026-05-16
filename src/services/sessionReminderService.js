const pool = require("../config/db");
const schedulingService = require("./mentorshipSchedulingService");

const reminderDefinitions = [
	{
		label: "24h",
		offsetMinutes: 24 * 60,
		field: "reminder_24h_sent_at",
		title: "Mentorship session reminder",
		message: (session) =>
			`Your mentorship session starts at ${new Date(session.session_start_at || session.scheduled_at).toLocaleString()}.`,
	},
	{
		label: "1h",
		offsetMinutes: 60,
		field: "reminder_1h_sent_at",
		title: "Mentorship session starting soon",
		message: (session) =>
			`Your mentorship session starts in about 1 hour at ${new Date(session.session_start_at || session.scheduled_at).toLocaleString()}.`,
	},
];

async function processReminder(definition) {
	const now = new Date();
	const lower = new Date(
		now.getTime() + (definition.offsetMinutes - 5) * 60 * 1000,
	);
	const upper = new Date(
		now.getTime() + (definition.offsetMinutes + 5) * 60 * 1000,
	);
	const result = await pool.query(
		`SELECT *
		 FROM mentorship_sessions
		 WHERE status IN ('pending', 'confirmed', 'scheduled')
		   AND ${definition.field} IS NULL
		   AND COALESCE(session_start_at, scheduled_at) >= $1
		   AND COALESCE(session_start_at, scheduled_at) < $2`,
		[lower.toISOString(), upper.toISOString()],
	);

	for (const session of result.rows) {
		await schedulingService.sendSessionNotifications(
			session,
			definition.title,
			definition.message(session),
			`mentorship_session_reminder_${definition.label}`,
		);
		await pool.query(
			`UPDATE mentorship_sessions SET ${definition.field} = NOW(), updated_at = NOW() WHERE mentorship_session_id = $1`,
			[session.mentorship_session_id],
		);
	}

	return result.rowCount;
}

async function processDueSessionReminders() {
	const results = [];
	for (const definition of reminderDefinitions) {
		const count = await processReminder(definition);
		results.push({ label: definition.label, count });
	}
	return results;
}

function startSessionReminderScheduler() {
	if (process.env.SESSION_REMINDERS_ENABLED === "false") {
		return null;
	}

	const intervalMs = Number(
		process.env.SESSION_REMINDER_INTERVAL_MS || 60 * 1000,
	);
	const run = async () => {
		try {
			await processDueSessionReminders();
		} catch (err) {
			console.error("Session reminder job failed:", err.message || err);
		}
	};

	setTimeout(run, 2000);
	const timer = setInterval(run, intervalMs);
	if (typeof timer.unref === "function") timer.unref();
	return timer;
}

module.exports = {
	processDueSessionReminders,
	startSessionReminderScheduler,
};
