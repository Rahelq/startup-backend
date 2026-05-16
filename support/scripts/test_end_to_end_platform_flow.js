const http = require("http");
const request = require("supertest");
const bcrypt = require("bcrypt");
const { io: createClient } = require("socket.io-client");

const app = require("../../src/app");
const pool = require("../../src/config/db");
const socketUtils = require("../../src/utils/socket");
const realtimeEmitter = require("../../src/utils/realtimeEmitter");

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}@gmail.com`;
}

async function login(appOrServer, email, password = "Demo123!") {
  return request(appOrServer).post("/api/auth/login").send({ email, password });
}

async function register(appOrServer, role, firstName, lastName, email, password = "Demo123!") {
  return request(appOrServer).post("/api/auth/register").send({
    first_name: firstName,
    last_name: lastName,
    email,
    password,
    role,
  });
}

async function approveUser(appOrServer, adminToken, userId) {
  return request(appOrServer)
    .put(`/api/admin/users/approve/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({});
}

function assertOk(res, label, expectedStatus = [200]) {
  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  if (!allowed.includes(res.statusCode)) {
    throw new Error(`${label} failed with ${res.statusCode}: ${JSON.stringify(res.body || {})}`);
  }
}

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6mLqsAAAAASUVORK5CYII=",
  "base64"
);

async function createAdmin(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  const insert = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_approved, is_active)
     VALUES ($1,$2,$3,$4,$5,true,true)
     RETURNING user_id`,
    ["E2E", "Admin", email, hashed, "Admin"]
  );
  const adminId = insert.rows[0].user_id;
  await pool.query(
    `INSERT INTO admins (user_id, privilege_level)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [adminId, 10]
  );
  return adminId;
}

function waitForSocketEvent(socket, eventName, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    function handler(payload) {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(payload);
    }

    socket.on(eventName, handler);
  });
}

async function main() {
  const server = http.createServer(app);
  socketUtils.init(server);
  realtimeEmitter.init(socketUtils.getIO());
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const socketUrl = `http://127.0.0.1:${port}`;

  const mentorEmail = uniqueEmail("e2e_mentor");
  const startupEmail = uniqueEmail("e2e_startup");
  const investorEmail = uniqueEmail("e2e_investor");
  const adminEmail = uniqueEmail("e2e_admin");

  let mentorSocket;
  let startupSocket;

  try {
    await createAdmin(adminEmail, "AdminPass123!");

    const mentorReg = await register(server, "Mentor", "Real", "Mentor", mentorEmail);
    const startupReg = await register(server, "Startup", "Real", "Startup", startupEmail);
    const investorReg = await register(server, "Investor", "Real", "Investor", investorEmail);

    assertOk(mentorReg, "mentor register", 201);
    assertOk(startupReg, "startup register", 201);
    assertOk(investorReg, "investor register", 201);

    const adminLogin = await login(server, adminEmail, "AdminPass123!");
    assertOk(adminLogin, "admin login");
    const adminToken = adminLogin.body.token;

    const mentorId = mentorReg.body.user.user_id;
    const startupId = startupReg.body.user.user_id;
    const investorId = investorReg.body.user.user_id;

    await approveUser(server, adminToken, mentorId);
    await approveUser(server, adminToken, startupId);
    await approveUser(server, adminToken, investorId);

    const mentorLogin = await login(server, mentorEmail);
    const startupLogin = await login(server, startupEmail);
    const investorLogin = await login(server, investorEmail);

    assertOk(mentorLogin, "mentor login");
    assertOk(startupLogin, "startup login");
    assertOk(investorLogin, "investor login");

    const mentorToken = mentorLogin.body.token;
    const startupToken = startupLogin.body.token;
    const investorToken = investorLogin.body.token;

    const mentorProfile = await request(server)
      .post("/api/mentors/profile")
      .set("Authorization", `Bearer ${mentorToken}`)
      .field("headline", "Lead Mentor")
      .field("expertise", "SaaS, Product, Growth")
      .field("years_experience", "10")
      .field("hourly_rate", "150")
      .field("country", "Ethiopia")
      .field("bio", "Mentor for real-world startup flows")
      .attach("cv", Buffer.from("mentor cv file"), {
        filename: "mentor-cv.pdf",
        contentType: "application/pdf",
      })
      .attach("government_id", Buffer.from("mentor id file"), {
        filename: "mentor-id.pdf",
        contentType: "application/pdf",
      });
    assertOk(mentorProfile, "mentor profile create", 201);

    const startupProfile = await request(server)
      .post("/api/startups/profile")
      .set("Authorization", `Bearer ${startupToken}`)
      .field("startup_name", "Nova Ethiopia")
      .field("industry", "Technology")
      .field("description", "StartupConnect end-to-end verification startup")
      .field("business_stage", "Seed")
      .field("founded_year", "2025")
      .field("team_size", "6")
      .field("location", "Addis Ababa")
      .field("website", "https://nova.example")
      .field("funding_needed", "250000")
      .attach("pitch_deck", Buffer.from("pitch deck file"), {
        filename: "pitch-deck.pdf",
        contentType: "application/pdf",
      })
      .attach("business_registration", Buffer.from("registration file"), {
        filename: "business-registration.pdf",
        contentType: "application/pdf",
      });
    assertOk(startupProfile, "startup profile create", 201);

    const investorProfile = await request(server)
      .post("/api/investors/profile")
      .set("Authorization", `Bearer ${investorToken}`)
      .field("investor_type", "Angel")
      .field("organization_name", "E2E Capital")
      .field("investment_budget", "1000000")
      .field("preferred_industry", "Technology")
      .field("investment_stage", "Seed")
      .field("country", "Ethiopia")
      .field("portfolio_size", "3")
      .field("bio", "Investor for end-to-end verification")
      .attach("profile_image", tinyPng, {
        filename: "investor-image.png",
        contentType: "image/png",
      });
    assertOk(investorProfile, "investor profile create", 201);

    const discoverMentors = await request(server)
      .get("/api/startups/discover")
      .set("Authorization", `Bearer ${startupToken}`);
    assertOk(discoverMentors, "startup discover");

    const discoverStartups = await request(server)
      .get("/api/investors/startups")
      .set("Authorization", `Bearer ${investorToken}`);
    assertOk(discoverStartups, "investor discover");

    const projectCreate = await request(server)
      .post("/api/projects/create")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        project_title: "Nova Platform",
        description: "Real project created during E2E smoke",
        funding_goal: 500000,
        status: "active",
      });
    assertOk(projectCreate, "project create", [200, 201]);
    const projectId = projectCreate.body.project?.project_id;

    if (projectId) {
      const projectDoc = await request(server)
        .post(`/api/projects/${projectId}/documents`)
        .set("Authorization", `Bearer ${startupToken}`)
        .attach("file", Buffer.from("project document"), {
          filename: "project-doc.pdf",
          contentType: "application/pdf",
        });
      assertOk(projectDoc, "project document upload", 201);
    }

    const mentorshipInteraction = await request(server)
      .post("/api/interactions")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        receiver_id: mentorId,
        type: "request",
        category: "mentorship",
        message: "Please mentor Nova Ethiopia",
      });
    assertOk(mentorshipInteraction, "mentorship interaction", 201);
    const mentorshipInteractionId = mentorshipInteraction.body.interaction.interaction_id;

    const mentorshipAccept = await request(server)
      .put(`/api/interactions/${mentorshipInteractionId}/respond`)
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({ status: "accepted" });
    assertOk(mentorshipAccept, "mentorship accept");

    const mentorshipRel = await request(server)
      .get("/api/interactions/relationships/mentorships")
      .set("Authorization", `Bearer ${startupToken}`);
    assertOk(mentorshipRel, "mentorship relationship list");
    const mentorshipId = mentorshipRel.body.mentorships?.[0]?.mentorship_id;
    if (!mentorshipId) throw new Error("No active mentorship relationship returned");

    const mentorshipProposal = await request(server)
      .post("/api/connection/mentorship-proposals")
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({
        mentorship_id: mentorshipId,
        title: "Mentorship Roadmap",
        proposal_text: "Eight-week support plan",
        expected_outcomes: { goals: ["product", "growth"] },
        estimated_weeks: 8,
      });
    assertOk(mentorshipProposal, "mentorship proposal", 201);
    const mentorshipProposalId = mentorshipProposal.body.proposal.mentorship_proposal_id;

    const mentorshipNegotiation = await request(server)
      .post("/api/connection/negotiations")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        parent_type: "mentorship_proposal",
        parent_id: mentorshipProposalId,
        message: "Can we make this ten weeks?",
      });
    assertOk(mentorshipNegotiation, "mentorship negotiation", 201);

    const booking = await request(server)
      .post("/api/mentorship-workflow/sessions/book")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        mentorship_id: mentorshipId,
        session_start_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        agenda: "E2E mentorship session",
      });
    assertOk(booking, "mentorship session booking", 201);
    const mentorshipSessionId = booking.body.session?.mentorship_session_id;

    if (mentorshipSessionId) {
      const notes = await request(server)
        .post(`/api/mentorship-workflow/sessions/${mentorshipSessionId}/notes`)
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          notes: "Mentorship session note",
          attendance_status: "completed",
          progress_topics: ["strategy", "execution"],
        });
      assertOk(notes, "mentorship session notes", [200, 201]);
    }

    const conversation = await request(server)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        user1_id: startupId,
        user2_id: mentorId,
        conversation_type: "mentor_chat",
      });
    assertOk(conversation, "conversation create");
    const conversationId = conversation.body.conversation?.conversation_id;
    if (!conversationId) throw new Error("Conversation id missing");

    mentorSocket = createClient(socketUrl, {
      auth: { token: mentorToken },
      transports: ["websocket"],
      forceNew: true,
    });
    startupSocket = createClient(socketUrl, {
      auth: { token: startupToken },
      transports: ["websocket"],
      forceNew: true,
    });

    await Promise.all([
      new Promise((resolve, reject) => {
        mentorSocket.on("connect", resolve);
        mentorSocket.on("connect_error", reject);
      }),
      new Promise((resolve, reject) => {
        startupSocket.on("connect", resolve);
        startupSocket.on("connect_error", reject);
      }),
    ]);

    await Promise.all([
      new Promise((resolve) => mentorSocket.emit("joinConversation", { conversationId }, resolve)),
      new Promise((resolve) => startupSocket.emit("joinConversation", { conversationId }, resolve)),
    ]);

    const socketMessagePromise = waitForSocketEvent(mentorSocket, "message:new");
    const message = await request(server)
      .post("/api/messages")
      .set("Authorization", `Bearer ${startupToken}`)
      .field("conversation_id", String(conversationId))
      .field("receiver_id", String(mentorId))
      .field("message", "E2E socket message")
      .field("message_type", "text")
      .field("conversation_type", "mentor_chat")
      .attach("file", Buffer.from("message attachment"), {
        filename: "message.pdf",
        contentType: "application/pdf",
      });
    assertOk(message, "message send", 201);
    await socketMessagePromise;

    const unread = await request(server)
      .get("/api/messages/unread")
      .set("Authorization", `Bearer ${mentorToken}`);
    assertOk(unread, "message unread count");

    const resourceUpload = await request(server)
      .post("/api/resources")
      .set("Authorization", `Bearer ${mentorToken}`)
      .field("relationship_type", "mentorship")
      .field("relationship_id", String(mentorshipId))
      .field("title", "Mentor Resource")
      .field("description", "Shared during E2E verification")
      .field("resource_type", "pdf")
      .field("visibility", "participants")
      .attach("file", Buffer.from("resource file"), {
        filename: "resource.pdf",
        contentType: "application/pdf",
      });
    assertOk(resourceUpload, "resource upload", 201);

    const paymentInit = await request(server)
      .post("/api/transactions/payments/initiate")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        relationship_id: mentorshipId,
        payment_type: "consultation",
        amount: 1500,
        currency: "ETB",
        description: "E2E mentorship payment",
      });
    assertOk(paymentInit, "payment initiate", 201);
    const txRef = paymentInit.body.tx_ref;
    if (txRef) {
      const paymentVerify = await request(server)
        .get(`/api/transactions/payments/${encodeURIComponent(txRef)}/verify`)
        .set("Authorization", `Bearer ${startupToken}`);
      assertOk(paymentVerify, "payment verify");
    }

    const investmentInteraction = await request(server)
      .post("/api/interactions")
      .set("Authorization", `Bearer ${investorToken}`)
      .send({
        receiver_id: startupId,
        type: "invite",
        category: "investment",
        message: "Interested in investing in Nova Ethiopia",
      });
    assertOk(investmentInteraction, "investment interaction", 201);
    const investmentInteractionId = investmentInteraction.body.interaction.interaction_id;

    const investmentAccept = await request(server)
      .put(`/api/interactions/${investmentInteractionId}/respond`)
      .set("Authorization", `Bearer ${startupToken}`)
      .send({ status: "accepted" });
    assertOk(investmentAccept, "investment accept");

    const investmentRel = await request(server)
      .get("/api/interactions/relationships/investments")
      .set("Authorization", `Bearer ${investorToken}`);
    assertOk(investmentRel, "investment relationship list");
    const investmentId = investmentRel.body.investments?.[0]?.investment_id;
    if (!investmentId) throw new Error("No active investment relationship returned");

    const investmentOffer = await request(server)
      .post("/api/connection/investment-offers")
      .set("Authorization", `Bearer ${investorToken}`)
      .send({
        investment_id: investmentId,
        title: "Seed Offer",
        offer_text: "We can fund the round",
        funding_amount: 100000,
        equity_percentage: 5,
      });
    assertOk(investmentOffer, "investment offer", 201);
    const investmentOfferId = investmentOffer.body.offer.investment_offer_id;

    const fundingRequest = await request(server)
      .post("/api/connection/funding-requests")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        investment_id: investmentId,
        project_id: projectId || null,
        title: "Funding request",
        request_text: "Funding for product development",
        amount_requested: 100000,
        use_of_funds: { use: "product" },
      });
    assertOk(fundingRequest, "funding request", 201);

    const investmentNegotiation = await request(server)
      .post("/api/connection/negotiations")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        parent_type: "investment_offer",
        parent_id: investmentOfferId,
        message: "Can we improve the terms?",
      });
    assertOk(investmentNegotiation, "investment negotiation", 201);

    const videoCreate = await request(server)
      .post("/api/video-sessions")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        participant_id: mentorId,
        scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 45,
        create_zoom: false,
      });
    assertOk(videoCreate, "video session create", 201);
    const videoSessionId =
      videoCreate.body.session?.id || videoCreate.body.session?.video_session_id;
    if (videoSessionId) {
      const videoJoin = await request(server)
        .post(`/api/video-sessions/${videoSessionId}/join`)
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({});
      assertOk(videoJoin, "video session join");
    }

    const startupDashboard = await request(server)
      .get("/api/dashboard/startup")
      .set("Authorization", `Bearer ${startupToken}`);
    const mentorDashboard = await request(server)
      .get("/api/dashboard/mentor")
      .set("Authorization", `Bearer ${mentorToken}`);
    const investorDashboard = await request(server)
      .get("/api/dashboard/investor")
      .set("Authorization", `Bearer ${investorToken}`);
    const adminDashboard = await request(server)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    assertOk(startupDashboard, "startup dashboard");
    assertOk(mentorDashboard, "mentor dashboard");
    assertOk(investorDashboard, "investor dashboard");
    assertOk(adminDashboard, "admin dashboard");

    const activityFeed = await request(server)
      .get("/api/activity/feed?scope=related&limit=10")
      .set("Authorization", `Bearer ${startupToken}`);
    const activitySummary = await request(server)
      .get("/api/activity/summary")
      .set("Authorization", `Bearer ${startupToken}`);
    assertOk(activityFeed, "activity feed");
    assertOk(activitySummary, "activity summary");

    const settingsUpdate = await request(server)
      .put("/api/settings")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({ timezone: "Africa/Addis_Ababa", language: "en" });
    const privacyUpdate = await request(server)
      .put("/api/settings/privacy")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({ profile_visibility: "connections", show_email: false });
    const notificationUpdate = await request(server)
      .put("/api/settings/notifications/preferences")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({ email_digest_frequency: "daily" });
    assertOk(settingsUpdate, "settings update");
    assertOk(privacyUpdate, "privacy update");
    assertOk(notificationUpdate, "notification update");

    const deviceList = await request(server)
      .get("/api/security/devices")
      .set("Authorization", `Bearer ${startupToken}`);
    const sessionList = await request(server)
      .get("/api/security/sessions")
      .set("Authorization", `Bearer ${startupToken}`);
    const twoFactorQr = await request(server)
      .get("/api/security/2fa/setup/qr")
      .set("Authorization", `Bearer ${startupToken}`);
    const adminSecurity = await request(server)
      .get("/api/admin/security/analytics")
      .set("Authorization", `Bearer ${adminToken}`);
    assertOk(deviceList, "device list");
    assertOk(sessionList, "session list");
    assertOk(twoFactorQr, "two factor qr", 200);
    assertOk(adminSecurity, "admin security analytics");

    console.log(
      JSON.stringify(
        {
          mentorId,
          startupId,
          investorId,
          projectId,
          mentorshipId,
          investmentId,
          txRef,
          dashboardStatuses: {
            startup: startupDashboard.statusCode,
            mentor: mentorDashboard.statusCode,
            investor: investorDashboard.statusCode,
            admin: adminDashboard.statusCode,
          },
          activityFeedCount: Array.isArray(activityFeed.body?.items)
            ? activityFeed.body.items.length
            : null,
          deviceCount: Array.isArray(deviceList.body?.data) ? deviceList.body.data.length : null,
          sessionCount: Array.isArray(sessionList.body?.data) ? sessionList.body.data.length : null,
          twoFactorQrStatus: twoFactorQr.statusCode,
        },
        null,
        2
      )
    );

    console.log("E2E_PLATFORM_FLOW_OK");
  } finally {
    if (mentorSocket) mentorSocket.close();
    if (startupSocket) startupSocket.close();
    await new Promise((resolve) => server.close(resolve));
    await pool.query("DELETE FROM users WHERE email LIKE $1", ["e2e_%@test.com"]);
  }
}

main().catch((err) => {
  console.error("E2E_PLATFORM_FLOW_FAILED", err.response?.data || err.stack || err.message || err);
  process.exit(1);
});
