const baseUrl = "http://localhost:3000";

async function login(email, password) {
	const res = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	const text = await res.text();
	if (!res.ok) {
		throw new Error(`Login failed for ${email}: ${text}`);
	}

	const json = JSON.parse(text);
	return json.token;
}

async function main() {
	const suffix = Date.now();
	const subject = `Mentorship Request ${suffix}`;

	const startupToken = await login("startup@startupconnect.test", "Demo123!");

	const createReqRes = await fetch(`${baseUrl}/api/mentorship/requests`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${startupToken}`,
		},
		body: JSON.stringify({
			mentor_id: 1,
			subject,
			message: "Need guidance on investor pitch and GTM strategy",
		}),
	});

	const createReqText = await createReqRes.text();
	console.log("CREATE_REQUEST_STATUS", createReqRes.status);
	console.log(createReqText);
	if (!createReqRes.ok) {
		throw new Error("Failed to create mentorship request");
	}

	const createReqJson = JSON.parse(createReqText);
	const requestId = createReqJson.mentorship_request.mentorship_request_id;

	const mentorToken = await login("mentor@startupconnect.test", "Demo123!");

	const incomingRes = await fetch(
		`${baseUrl}/api/mentorship/requests/incoming`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${mentorToken}`,
			},
		},
	);

	const incomingText = await incomingRes.text();
	console.log("INCOMING_STATUS", incomingRes.status);
	console.log(incomingText);
	if (!incomingRes.ok) {
		throw new Error("Failed to list mentor incoming requests");
	}

	const respondRes = await fetch(
		`${baseUrl}/api/mentorship/requests/${requestId}/respond`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${mentorToken}`,
			},
			body: JSON.stringify({ status: "accepted" }),
		},
	);

	const respondText = await respondRes.text();
	console.log("RESPOND_STATUS", respondRes.status);
	console.log(respondText);
	if (!respondRes.ok) {
		throw new Error("Failed to respond to mentorship request");
	}

	const scheduleRes = await fetch(`${baseUrl}/api/mentorship/sessions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${mentorToken}`,
		},
		body: JSON.stringify({
			mentorship_request_id: requestId,
			scheduled_at: new Date(Date.now() + 86400000).toISOString(),
			duration_minutes: 60,
			meeting_link: "https://meet.example/session-123",
			notes: "Initial discovery and planning session",
		}),
	});

	const scheduleText = await scheduleRes.text();
	console.log("SCHEDULE_STATUS", scheduleRes.status);
	console.log(scheduleText);
	if (!scheduleRes.ok) {
		throw new Error("Failed to schedule mentorship session");
	}

	const startupHistoryRes = await fetch(`${baseUrl}/api/mentorship/history`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${startupToken}`,
		},
	});

	const startupHistoryText = await startupHistoryRes.text();
	console.log("STARTUP_HISTORY_STATUS", startupHistoryRes.status);
	console.log(startupHistoryText);

	const mentorHistoryRes = await fetch(`${baseUrl}/api/mentorship/history`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${mentorToken}`,
		},
	});

	const mentorHistoryText = await mentorHistoryRes.text();
	console.log("MENTOR_HISTORY_STATUS", mentorHistoryRes.status);
	console.log(mentorHistoryText);
}

main().catch((err) => {
	console.error("TEST_MENTORSHIP_FLOW_FAILED", err.message);
	process.exit(1);
});
