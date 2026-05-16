const fs = require("fs/promises");
const path = require("path");

const baseUrl = "http://localhost:3000";
const sampleFilePath = path.join(__dirname, "demo_pitch_deck.txt");
const startupPassword = process.env.STARTUP_PASSWORD || "Demo123!";
const mentorPassword = process.env.MENTOR_PASSWORD || "Demo123!";
const adminPassword = process.env.ADMIN_PASSWORD || "Demo123!";

async function login(email, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  console.log(`LOGIN_${email.toUpperCase()}_STATUS`, res.status);
  console.log(text);

  if (!res.ok) {
    throw new Error(`Login failed for ${email}`);
  }

  return JSON.parse(text).token;
}

async function jsonRequest(url, method, token, body) {
  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  console.log(`${method}_${url}_STATUS`, res.status);
  console.log(text);
  if (!res.ok) {
    throw new Error(`${method} ${url} failed`);
  }

  return text ? JSON.parse(text) : {};
}

async function main() {
  const startupToken = await login("startup@startupconnect.test", startupPassword);
  const mentorToken = await login("mentor@startupconnect.test", mentorPassword);
  let adminToken;
  try {
    adminToken = await login("admin@startupconnect.test", adminPassword);
  } catch {
    // Fallback for environments where reset_admin_password.js set AdminPass123!
    adminToken = await login("admin@startupconnect.test", "AdminPass123!");
  }

  const mentorsRes = await fetch(`${baseUrl}/api/mentors/all`, {
    headers: { Authorization: `Bearer ${startupToken}` },
  });
  const mentorsText = await mentorsRes.text();
  console.log("GET_/api/mentors/all_STATUS", mentorsRes.status);
  console.log(mentorsText);
  if (!mentorsRes.ok) throw new Error("Failed to load mentors");

  const mentors = JSON.parse(mentorsText);
  const mentor = mentors.find((item) => item.email === "mentor@startupconnect.test");
  if (!mentor) {
    throw new Error("Seed mentor not found");
  }

  const createRequest = await jsonRequest("/api/mentorship/requests", "POST", startupToken, {
    mentor_id: mentor.mentor_id,
    subject: `Mentorship Extras ${Date.now()}`,
    message: "Need help with pitch deck and investor readiness",
  });

  const requestId = createRequest.mentorship_request.mentorship_request_id;

  await jsonRequest(`/api/mentorship/requests/${requestId}/respond`, "PUT", mentorToken, {
    status: "accepted",
  });

  const scheduleRes = await fetch(`${baseUrl}/api/mentorship/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      mentorship_request_id: requestId,
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      duration_minutes: 45,
      meeting_link: "https://meet.example/mentorship-extra",
      notes: "Planning, pitch, and investor prep",
    }),
  });
  const scheduleText = await scheduleRes.text();
  console.log("POST_/api/mentorship/sessions_STATUS", scheduleRes.status);
  console.log(scheduleText);
  if (!scheduleRes.ok) throw new Error("Failed to schedule session");
  const sessionId = JSON.parse(scheduleText).mentorship_session.mentorship_session_id;

  await jsonRequest("/api/mentorship/reports", "POST", mentorToken, {
    mentorship_session_id: sessionId,
    report_title: "Initial Mentorship Report",
    summary: "Covered investor pitch structure, traction evidence, and fundraising milestones.",
    action_items: ["Update pitch deck", "Add traction slides"],
    next_steps: ["Follow-up review", "Prepare investor Q&A"],
    progress_rating: 4,
    startup_feedback: "Clear and actionable",
    mentor_notes: "Great progress, next session should focus on metrics.",
  });

  const uploadForm = new FormData();
  uploadForm.append("mentorship_request_id", String(requestId));
  uploadForm.append("mentorship_session_id", String(sessionId));
  uploadForm.append("resource_title", "Pitch Deck Template");
  uploadForm.append("resource_description", "Template to help structure the next pitch version");
  uploadForm.append("resource_type", "file");
  const fileBuffer = await fs.readFile(sampleFilePath);
  uploadForm.append("file", new Blob([fileBuffer], { type: "text/plain" }), "demo_pitch_deck.txt");

  const resourceRes = await fetch(`${baseUrl}/api/mentorship/resources`, {
    method: "POST",
    headers: { Authorization: `Bearer ${mentorToken}` },
    body: uploadForm,
  });
  const resourceText = await resourceRes.text();
  console.log("POST_/api/mentorship/resources_STATUS", resourceRes.status);
  console.log(resourceText);
  if (!resourceRes.ok) throw new Error("Failed to share resource");

  await jsonRequest("/api/mentorship/payments", "POST", startupToken, {
    mentorship_session_id: sessionId,
    amount: 120,
    payment_method: "Telebirr",
    currency: "USD",
    status: "completed",
  });

  await jsonRequest("/api/mentorship/chat/messages", "POST", startupToken, {
    other_user_id: mentor.user_id,
    subject: "Mentorship follow-up",
    body: "Please review the new pitch deck draft.",
  });

  await jsonRequest("/api/mentorship/chat/messages", "POST", mentorToken, {
    other_user_id: (
      await (
        await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "startup@startupconnect.test",
            password: startupPassword,
          }),
        })
      ).json()
    ).user.user_id,
    subject: "Re: Mentorship follow-up",
    body: "Received. I will review it before the next session.",
  });

  const convoRes = await fetch(`${baseUrl}/api/mentorship/chat/conversation/${mentor.user_id}`, {
    headers: { Authorization: `Bearer ${startupToken}` },
  });
  const convoText = await convoRes.text();
  console.log("GET_/api/mentorship/chat/conversation_STATUS", convoRes.status);
  console.log(convoText);

  const historyRes = await fetch(`${baseUrl}/api/mentorship/history`, {
    headers: { Authorization: `Bearer ${startupToken}` },
  });
  const historyText = await historyRes.text();
  console.log("GET_/api/mentorship/history_STATUS", historyRes.status);
  console.log(historyText);

  const overviewRes = await fetch(`${baseUrl}/api/admin/mentorship/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const overviewText = await overviewRes.text();
  console.log("GET_/api/admin/mentorship/overview_STATUS", overviewRes.status);
  console.log(overviewText);
}

main().catch((err) => {
  console.error("TEST_MENTORSHIP_EXTRAS_FAILED", err.message);
  process.exit(1);
});
