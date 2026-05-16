const http = require("http");
const axios = require("axios");
const app = require("../../src/app");
const socketUtils = require("../../src/utils/socket");
const realtimeEmitter = require("../../src/utils/realtimeEmitter");
const sessionReminderService = require("../../src/services/sessionReminderService");
const pool = require("../../src/config/db");
const bcrypt = require("bcrypt");

jest.setTimeout(30000);

describe("Phase 2 Integration Flows", () => {
  let server;
  let baseUrl;
  let reminderTimer = null;

  beforeAll((done) => {
    server = http.createServer(app);
    socketUtils.init(server);
    const io = socketUtils.getIO();
    realtimeEmitter.init(io);
    reminderTimer = sessionReminderService.startSessionReminderScheduler();
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll(async () => {
    if (server && server.close) await new Promise((r) => server.close(r));
    if (reminderTimer && typeof reminderTimer.unref === "function") {
      try {
        clearInterval(reminderTimer);
      } catch {}
    }
    await pool.query("DELETE FROM users WHERE email LIKE $1", ["p2_%@test.com"]);
  });

  test("mentorship and investment flows (interactions -> relationships -> proposals/offers/negotiations)", async () => {
    // Register mentor, startup, investor
    const mentorEmail = `p2_mentor_${Date.now()}@test.com`;
    const startupEmail = `p2_startup_${Date.now()}@test.com`;
    const investorEmail = `p2_investor_${Date.now()}@test.com`;

    const mentorReg = await axios.post(`${baseUrl}/api/auth/register`, {
      first_name: "P2",
      last_name: "Mentor",
      email: mentorEmail,
      password: "Pass1234",
      role: "Mentor",
    });
    const startupReg = await axios.post(`${baseUrl}/api/auth/register`, {
      first_name: "P2",
      last_name: "Startup",
      email: startupEmail,
      password: "Pass1234",
      role: "Startup",
    });
    const investorReg = await axios.post(`${baseUrl}/api/auth/register`, {
      first_name: "P2",
      last_name: "Investor",
      email: investorEmail,
      password: "Pass1234",
      role: "Investor",
    });

    const mentorId = mentorReg.data.user.user_id;
    const startupId = startupReg.data.user.user_id;
    const investorId = investorReg.data.user.user_id;

    // Create admin and approve users
    const adminEmail = `p2_admin_${Date.now()}@test.com`;
    const hashed = await bcrypt.hash("AdminPass", 10);
    const ins = await pool.query(
      "INSERT INTO users (first_name,last_name,email,password_hash,role,is_approved) VALUES($1,$2,$3,$4,$5,true) RETURNING user_id",
      ["P2", "Admin", adminEmail, hashed, "Admin"]
    );
    const adminId = ins.rows[0].user_id;
    await pool.query(
      "INSERT INTO admins (user_id, privilege_level) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [adminId, 10]
    );

    const adminLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: adminEmail,
      password: "AdminPass",
    });
    const adminToken = adminLogin.data.token;

    await axios.put(
      `${baseUrl}/api/admin/users/approve/${mentorId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.put(
      `${baseUrl}/api/admin/users/approve/${startupId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.put(
      `${baseUrl}/api/admin/users/approve/${investorId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Login mentor, startup, investor
    const mLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: mentorEmail,
      password: "Pass1234",
    });
    const sLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: startupEmail,
      password: "Pass1234",
    });
    const iLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: investorEmail,
      password: "Pass1234",
    });

    const mToken = mLogin.data.token;
    const sToken = sLogin.data.token;
    const iToken = iLogin.data.token;

    // Create profiles
    await axios.post(
      `${baseUrl}/api/mentors/profile`,
      { headline: "P2 Mentor", expertise: "Testing" },
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    await axios.post(
      `${baseUrl}/api/startups/profile`,
      { startup_name: "P2 Startup", industry: "SaaS" },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );

    // 1) Mentorship interaction: startup -> mentor (request), mentor accepts
    const createInteraction = await axios.post(
      `${baseUrl}/api/interactions`,
      {
        receiver_id: mentorId,
        type: "request",
        category: "mentorship",
        message: "Please mentor us",
      },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );
    const interactionId = createInteraction.data.interaction.interaction_id;
    await axios.put(
      `${baseUrl}/api/interactions/${interactionId}/respond`,
      { status: "accepted" },
      { headers: { Authorization: `Bearer ${mToken}` } }
    );

    // verify mentorship relationship exists
    const rels = await axios.get(`${baseUrl}/api/interactions/relationships/mentorships`, {
      headers: { Authorization: `Bearer ${sToken}` },
    });
    expect(Array.isArray(rels.data.mentorships)).toBe(true);
    expect(rels.data.mentorships.length).toBeGreaterThan(0);
    const mentorship = rels.data.mentorships[0];

    // Mentor creates a mentorship proposal
    const prop = await axios.post(
      `${baseUrl}/api/connection/mentorship-proposals`,
      {
        mentorship_id: mentorship.mentorship_id,
        title: "Initial Proposal",
        proposal_text: "I will mentor for 8 weeks",
        expected_outcomes: { goals: ["advice"] },
        estimated_weeks: 8,
      },
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    expect(prop.status).toBe(201);
    const proposalId = prop.data.proposal.mentorship_proposal_id;

    // Startup creates a negotiation on the proposal
    const neg = await axios.post(
      `${baseUrl}/api/connection/negotiations`,
      {
        parent_type: "mentorship_proposal",
        parent_id: proposalId,
        message: "Can we adjust to 10 weeks?",
      },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );
    expect(neg.status).toBe(201);

    const listNeg = await axios.get(
      `${baseUrl}/api/connection/negotiations/mentorship_proposal/${proposalId}`,
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    expect(Array.isArray(listNeg.data.negotiations)).toBe(true);
    expect(listNeg.data.negotiations.length).toBeGreaterThan(0);

    // 2) Investment interaction: investor -> startup (invite), startup accepts
    const investInteraction = await axios.post(
      `${baseUrl}/api/interactions`,
      {
        receiver_id: startupId,
        type: "invite",
        category: "investment",
        message: "Interested in investing",
      },
      { headers: { Authorization: `Bearer ${iToken}` } }
    );
    const investInteractionId = investInteraction.data.interaction.interaction_id;
    await axios.put(
      `${baseUrl}/api/interactions/${investInteractionId}/respond`,
      { status: "accepted" },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );

    // verify investment relationship exists
    const invRels = await axios.get(`${baseUrl}/api/interactions/relationships/investments`, {
      headers: { Authorization: `Bearer ${iToken}` },
    });
    expect(Array.isArray(invRels.data.investments)).toBe(true);
    expect(invRels.data.investments.length).toBeGreaterThan(0);
    const investment = invRels.data.investments[0];

    // Investor creates an investment offer
    const offer = await axios.post(
      `${baseUrl}/api/connection/investment-offers`,
      {
        investment_id: investment.investment_id,
        title: "Seed Offer",
        offer_text: "We offer $100k",
        funding_amount: 100000,
        equity_percentage: 5,
      },
      { headers: { Authorization: `Bearer ${iToken}` } }
    );
    expect(offer.status).toBe(201);
    const offerId = offer.data.offer.investment_offer_id;

    // Startup creates a funding request linked to the investment
    const fundingReq = await axios.post(
      `${baseUrl}/api/connection/funding-requests`,
      {
        investment_id: investment.investment_id,
        project_id: null,
        title: "Funding Request",
        request_text: "Need funds for product development",
        amount_requested: 100000,
        use_of_funds: { use: "dev" },
      },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );
    expect(fundingReq.status).toBe(201);
    const fundingId = fundingReq.data.funding_request.funding_request_id;

    // Create negotiation for investment offer
    const invNeg = await axios.post(
      `${baseUrl}/api/connection/negotiations`,
      { parent_type: "investment_offer", parent_id: offerId, message: "Can we change terms?" },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );
    expect(invNeg.status).toBe(201);

    const listInvNeg = await axios.get(
      `${baseUrl}/api/connection/negotiations/investment_offer/${offerId}`,
      { headers: { Authorization: `Bearer ${iToken}` } }
    );
    expect(Array.isArray(listInvNeg.data.negotiations)).toBe(true);
    expect(listInvNeg.data.negotiations.length).toBeGreaterThan(0);
  });
});
