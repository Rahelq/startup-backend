const http = require("http");
const request = require("supertest");
const { io: createClient } = require("socket.io-client");
const bcrypt = require("bcrypt");
const app = require("../../src/app");
const pool = require("../../src/config/db");
const socketUtils = require("../../src/utils/socket");
const realtimeEmitter = require("../../src/utils/realtimeEmitter");

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}@test.com`;
}

async function login(email, password = "Demo123!") {
  return request(app).post("/api/auth/login").send({ email, password });
}

async function register(role, firstName, lastName, email, password = "Demo123!") {
  return request(app).post("/api/auth/register").send({
    first_name: firstName,
    last_name: lastName,
    email,
    password,
    role,
  });
}

async function approveUser(adminToken, userId) {
  return request(app)
    .put(`/api/admin/users/approve/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({});
}

function waitForSocketEvent(socket, eventName, timeoutMs = 7000) {
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

  let mentorSocket;
  let startupSocket;

  try {
    const adminEmail = uniqueEmail("phase4_admin");
    const mentorEmail = uniqueEmail("phase4_mentor");
    const startupEmail = uniqueEmail("phase4_startup");
    const investorEmail = uniqueEmail("phase4_investor");

    const adminHash = await bcrypt.hash("AdminPass123!", 10);
    const adminInsert = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_approved, is_active)
       VALUES ($1,$2,$3,$4,$5,true,true)
       RETURNING user_id`,
      ["Phase4", "Admin", adminEmail, adminHash, "Admin"]
    );
    const adminUserId = adminInsert.rows[0].user_id;
    await pool.query(
      `INSERT INTO admins (user_id, privilege_level)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [adminUserId, 10]
    );

    const mentorReg = await register("Mentor", "Phase4", "Mentor", mentorEmail);
    const startupReg = await register("Startup", "Phase4", "Startup", startupEmail);
    const investorReg = await register("Investor", "Phase4", "Investor", investorEmail);

    console.log("register_mentor_status=", mentorReg.statusCode);
    console.log("register_startup_status=", startupReg.statusCode);
    console.log("register_investor_status=", investorReg.statusCode);

    const adminLogin = await login(adminEmail, "AdminPass123!");
    console.log("login_admin_status=", adminLogin.statusCode);
    const adminToken = adminLogin.body.token;

    const mentorId = mentorReg.body.user.user_id;
    const startupId = startupReg.body.user.user_id;
    const investorId = investorReg.body.user.user_id;

    await approveUser(adminToken, mentorId);
    await approveUser(adminToken, startupId);
    await approveUser(adminToken, investorId);

    const mentorLogin = await login(mentorEmail);
    const startupLogin = await login(startupEmail);
    const investorLogin = await login(investorEmail);

    console.log("login_mentor_status=", mentorLogin.statusCode);
    console.log("login_startup_status=", startupLogin.statusCode);
    console.log("login_investor_status=", investorLogin.statusCode);

    const mentorToken = mentorLogin.body.token;
    const startupToken = startupLogin.body.token;
    const investorToken = investorLogin.body.token;

    await request(app)
      .post("/api/mentors/profile")
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({ headline: "Phase4 Mentor", expertise: "Product, Growth" });

    await request(app)
      .post("/api/startups/profile")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        startup_name: "Phase4 Startup",
        industry: "SaaS",
        description: "Smoke test startup",
      });

    await request(app)
      .post("/api/investors/profile")
      .set("Authorization", `Bearer ${investorToken}`)
      .send({
        investor_type: "Angel",
        organization_name: "Phase4 Capital",
        investment_budget: 100000,
        preferred_industry: "SaaS",
      });

    const mentorshipInteraction = await request(app)
      .post("/api/interactions")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        receiver_id: mentorId,
        type: "request",
        category: "mentorship",
        message: "Please mentor our startup",
      });
    console.log("mentorship_interaction_status=", mentorshipInteraction.statusCode);
    const mentorshipInteractionId = mentorshipInteraction.body.interaction.interaction_id;

    const mentorshipAccept = await request(app)
      .put(`/api/interactions/${mentorshipInteractionId}/respond`)
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({ status: "accepted" });
    console.log("mentorship_accept_status=", mentorshipAccept.statusCode);

    const investmentInteraction = await request(app)
      .post("/api/interactions")
      .set("Authorization", `Bearer ${investorToken}`)
      .send({
        receiver_id: startupId,
        type: "invite",
        category: "investment",
        message: "Interested in funding",
      });
    console.log("investment_interaction_status=", investmentInteraction.statusCode);
    const investmentInteractionId = investmentInteraction.body.interaction.interaction_id;

    const investmentAccept = await request(app)
      .put(`/api/interactions/${investmentInteractionId}/respond`)
      .set("Authorization", `Bearer ${startupToken}`)
      .send({ status: "accepted" });
    console.log("investment_accept_status=", investmentAccept.statusCode);

    const mentorships = await request(app)
      .get("/api/interactions/relationships/mentorships")
      .set("Authorization", `Bearer ${startupToken}`);
    const investments = await request(app)
      .get("/api/interactions/relationships/investments")
      .set("Authorization", `Bearer ${investorToken}`);

    const mentorshipId = mentorships.body.mentorships?.[0]?.mentorship_id;
    const investmentId = investments.body.investments?.[0]?.investment_id;
    console.log("has_mentorship_relationship=", Boolean(mentorshipId));
    console.log("has_investment_relationship=", Boolean(investmentId));

    if (!mentorshipId || !investmentId) {
      throw new Error("Active relationships were not established correctly");
    }

    const conversationRes = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        user1_id: startupId,
        user2_id: mentorId,
        conversation_type: "mentor_chat",
      });
    console.log("conversation_status=", conversationRes.statusCode);
    if (conversationRes.statusCode !== 200 || !conversationRes.body.conversation) {
      throw new Error(conversationRes.body.error || "Conversation creation failed");
    }
    const conversationId = conversationRes.body.conversation.conversation_id;

    const messageRes = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        conversation_id: conversationId,
        receiver_id: mentorId,
        message: "Phase4 chat smoke message",
        message_type: "text",
        conversation_type: "mentor_chat",
      });
    console.log("message_http_status=", messageRes.statusCode);

    const unreadRes = await request(app)
      .get("/api/messages/unread")
      .set("Authorization", `Bearer ${mentorToken}`);
    console.log("mentor_unread_status=", unreadRes.statusCode);
    console.log("mentor_unread_count=", unreadRes.body.unread_count);

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

    const socketMessagePromise = waitForSocketEvent(mentorSocket, "message:new", 10000);
    startupSocket.emit(
      "send_message",
      {
        conversationId,
        receiverId: mentorId,
        message: "Socket delivery smoke",
        messageType: "text",
      },
      () => {}
    );
    const socketMessage = await socketMessagePromise;
    console.log("socket_message_received=", Boolean(socketMessage));

    const seenRes = await request(app)
      .put(`/api/messages/seen/${conversationId}`)
      .set("Authorization", `Bearer ${mentorToken}`);
    console.log("messages_seen_status=", seenRes.statusCode);

    const pricingRes = await request(app)
      .post(`/api/mentorship-workflow/mentors/${mentorshipId}/pricing`)
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({
        hourly_rate: 75,
        session_duration_minutes: 60,
        availability_json: [
          { day_of_week: new Date().getUTCDay(), start_time: "09:00:00", end_time: "17:00:00" },
        ],
      });
    console.log("pricing_status=", pricingRes.statusCode);

    const futureSessionStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const bookSessionRes = await request(app)
      .post("/api/mentorship-workflow/sessions/book")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        mentorship_id: mentorshipId,
        session_start_at: futureSessionStart,
        agenda: "Phase4 scheduling smoke",
      });
    console.log("book_session_status=", bookSessionRes.statusCode);
    const mentorshipSessionId = bookSessionRes.body.session?.mentorship_session_id;

    const recordNotesRes = await request(app)
      .post(`/api/mentorship-workflow/sessions/${mentorshipSessionId}/notes`)
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({
        notes: "Phase4 session note",
        attendance_status: "completed",
        progress_topics: ["product", "go-to-market"],
      });
    console.log("record_notes_status=", recordNotesRes.statusCode);

    const resourceRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${mentorToken}`)
      .field("relationship_type", "mentorship")
      .field("relationship_id", String(mentorshipId))
      .field("title", "Phase4 Smoke Resource")
      .field("description", "Uploaded from real user smoke test")
      .field("resource_type", "pdf")
      .field("visibility", "participants")
      .attach("file", Buffer.from("Phase4 resource smoke test"), {
        filename: "phase4-smoke.pdf",
        contentType: "application/pdf",
      });
    console.log("resource_upload_status=", resourceRes.statusCode);
    const resourceId = resourceRes.body.resource?.resource_id;

    const resourcesList = await request(app)
      .get(`/api/resources?relationship_type=mentorship&relationship_id=${mentorshipId}`)
      .set("Authorization", `Bearer ${startupToken}`);
    console.log("resource_list_status=", resourcesList.statusCode);
    console.log(
      "resource_count=",
      Array.isArray(resourcesList.body.resources) ? resourcesList.body.resources.length : -1
    );

    const mentorNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${mentorToken}`);
    const mentorUnreadCount = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${mentorToken}`);
    console.log("notifications_status=", mentorNotifications.statusCode);
    console.log("notification_unread_count=", mentorUnreadCount.body.unread_count);

    const activityRows = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM activity_logs WHERE user_id = $1`,
      [mentorId]
    );
    console.log("activity_count=", activityRows.rows[0].cnt);

    const startupDashboard = await request(app)
      .get("/api/startups/dashboard")
      .set("Authorization", `Bearer ${startupToken}`);
    const investorDashboard = await request(app)
      .get("/api/investors/portfolio")
      .set("Authorization", `Bearer ${investorToken}`);
    console.log("startup_dashboard_status=", startupDashboard.statusCode);
    console.log("investor_dashboard_status=", investorDashboard.statusCode);

    const videoCreateRes = await request(app)
      .post("/api/video-sessions")
      .set("Authorization", `Bearer ${startupToken}`)
      .send({
        participant_id: mentorId,
        scheduled_at: futureSessionStart,
        duration: 45,
        topic: "Phase4 Video Smoke",
      });
    console.log("video_create_status=", videoCreateRes.statusCode);
    const videoId =
      videoCreateRes.body.id ||
      videoCreateRes.body.video_session_id ||
      videoCreateRes.body.session_id;

    const videoListRes = await request(app)
      .get("/api/video-sessions")
      .set("Authorization", `Bearer ${startupToken}`);
    console.log("video_list_status=", videoListRes.statusCode);

    if (videoId && videoCreateRes.body.meeting_link) {
      const videoJoinRes = await request(app)
        .post(`/api/video-sessions/${videoId}/join`)
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({});
      console.log("video_join_status=", videoJoinRes.statusCode);
    } else {
      console.log("video_join_status=", "skipped_no_meeting_link");
    }

    console.log("phase4_smoke_complete=", true);

    if (startupSocket) startupSocket.close();
    if (mentorSocket) mentorSocket.close();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("PHASE4_SMOKE_FAILED", error.message);
    if (startupSocket) startupSocket.close();
    if (mentorSocket) mentorSocket.close();
    try {
      await new Promise((resolve) => server.close(resolve));
    } catch {}
    try {
      await pool.end();
    } catch {}
    process.exit(1);
  }
}

main();
