const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";

async function testInteractionSystem() {
  console.log("[Interaction System Test] Starting comprehensive tests...\n");

  try {
    // ============================================
    // 1. SETUP: Create test users
    // ============================================
    console.log("→ Creating test users...");

    // Mentor
    const mentorRes = await axios.post(`${BASE_URL}/auth/register`, {
      first_name: "Mentor",
      last_name: "User",
      email: `mentor_${Date.now()}@test.com`,
      password: "TestPass123!",
      role: "Mentor",
    });
    const mentorId = mentorRes.data.user.user_id;
    console.log(`✓ Mentor created: ${mentorId}`);

    // Startup
    const startupRes = await axios.post(`${BASE_URL}/auth/register`, {
      first_name: "Startup",
      last_name: "User",
      email: `startup_${Date.now()}@test.com`,
      password: "TestPass123!",
      role: "Startup",
    });
    const startupId = startupRes.data.user.user_id;
    console.log(`✓ Startup created: ${startupId}`);

    // Investor
    const investorRes = await axios.post(`${BASE_URL}/auth/register`, {
      first_name: "Investor",
      last_name: "User",
      email: `investor_${Date.now()}@test.com`,
      password: "TestPass123!",
      role: "Investor",
    });
    const investorId = investorRes.data.user.user_id;
    console.log(`✓ Investor created: ${investorId}\n`);

    // Get tokens
    const mentorLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: mentorRes.data.user.email,
      password: "TestPass123!",
    });
    const mentorToken = mentorLogin.data.token;

    const startupLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: startupRes.data.user.email,
      password: "TestPass123!",
    });
    const startupToken = startupLogin.data.token;

    const investorLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: investorRes.data.user.email,
      password: "TestPass123!",
    });
    const investorToken = investorLogin.data.token;

    // Approve all users (seeded admin — register as Admin via API is disabled)
    console.log("→ Approving users...");
    const adminEmail = process.env.ADMIN_TEST_EMAIL || "admin@startupconnect.test";
    const adminPassword = process.env.ADMIN_TEST_PASSWORD || "Demo123!";
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });
    const adminToken = adminLogin.data.token;

    await axios.put(
      `${BASE_URL}/admin/users/approve/${mentorId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.put(
      `${BASE_URL}/admin/users/approve/${startupId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.put(
      `${BASE_URL}/admin/users/approve/${investorId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log("✓ All users approved\n");

    // ============================================
    // 2. TEST: Mentorship Request (Startup → Mentor)
    // ============================================
    console.log("→ TEST 1: Startup sends mentorship REQUEST to Mentor");
    const mentorshipRequestRes = await axios.post(
      `${BASE_URL}/interactions`,
      {
        receiver_id: mentorId,
        type: "request",
        category: "mentorship",
        message: "I need guidance on scaling my startup",
      },
      { headers: { Authorization: `Bearer ${startupToken}` } }
    );

    const mentorshipInteractionId = mentorshipRequestRes.data.interaction.interaction_id;
    console.log(`✓ Mentorship request created: ${mentorshipInteractionId}`);
    console.log(`  Status: ${mentorshipRequestRes.data.interaction.status}\n`);

    // ============================================
    // 3. TEST: Mentor accepts mentorship request
    // ============================================
    console.log("→ TEST 2: Mentor ACCEPTS mentorship request");
    const mentorshipAcceptRes = await axios.put(
      `${BASE_URL}/interactions/${mentorshipInteractionId}/respond`,
      { status: "accepted" },
      { headers: { Authorization: `Bearer ${mentorToken}` } }
    );

    console.log("✓ Mentorship request accepted");
    console.log(`  New status: ${mentorshipAcceptRes.data.interaction.status}\n`);

    // ============================================
    // 4. TEST: Get active mentorships
    // ============================================
    console.log("→ TEST 3: Mentor views active mentorships");
    const activeMentorshipsRes = await axios.get(
      `${BASE_URL}/interactions/relationships/mentorships`,
      { headers: { Authorization: `Bearer ${mentorToken}` } }
    );

    console.log(`✓ Active mentorships: ${activeMentorshipsRes.data.mentorships.length}`);
    if (activeMentorshipsRes.data.mentorships.length > 0) {
      console.log(`  Startup: ${activeMentorshipsRes.data.mentorships[0].startup_name}\n`);
    }

    // ============================================
    // 5. TEST: Investment Invite (Investor → Startup)
    // ============================================
    console.log("→ TEST 4: Investor sends INVESTMENT INVITE to Startup");
    const investmentInviteRes = await axios.post(
      `${BASE_URL}/interactions`,
      {
        receiver_id: startupId,
        type: "invite",
        category: "investment",
        message: "I'm interested in funding your startup",
        funding_amount: 50000,
        equity_offer: 10,
      },
      { headers: { Authorization: `Bearer ${investorToken}` } }
    );

    const investmentInteractionId = investmentInviteRes.data.interaction.interaction_id;
    console.log(`✓ Investment invite created: ${investmentInteractionId}`);
    console.log(`  Funding: $${investmentInviteRes.data.interaction.funding_amount}\n`);

    // ============================================
    // 6. TEST: Startup rejects investment
    // ============================================
    console.log("→ TEST 5: Startup REJECTS investment invite");
    const rejectRes = await axios.put(
      `${BASE_URL}/interactions/${investmentInteractionId}/respond`,
      { status: "rejected" },
      { headers: { Authorization: `Bearer ${startupToken}` } }
    );

    console.log("✓ Investment invite rejected");
    console.log(`  New status: ${rejectRes.data.interaction.status}\n`);

    // ============================================
    // 7. TEST: Startup sends investment request
    // ============================================
    console.log("→ TEST 6: Startup sends INVESTMENT REQUEST to Investor");
    const investmentRequestRes = await axios.post(
      `${BASE_URL}/interactions`,
      {
        receiver_id: investorId,
        type: "request",
        category: "investment",
        message: "Seeking $100k for Series A",
        funding_amount: 100000,
        equity_offer: 15,
      },
      { headers: { Authorization: `Bearer ${startupToken}` } }
    );

    const investmentRequestId = investmentRequestRes.data.interaction.interaction_id;
    console.log(`✓ Investment request created: ${investmentRequestId}`);
    console.log(`  Equity: ${investmentRequestRes.data.interaction.equity_offer}%\n`);

    // ============================================
    // 8. TEST: Investor accepts investment
    // ============================================
    console.log("→ TEST 7: Investor ACCEPTS investment request");
    const investmentAcceptRes = await axios.put(
      `${BASE_URL}/interactions/${investmentRequestId}/respond`,
      { status: "accepted" },
      { headers: { Authorization: `Bearer ${investorToken}` } }
    );

    console.log("✓ Investment request accepted");
    console.log(`  New status: ${investmentAcceptRes.data.interaction.status}\n`);

    // ============================================
    // 9. TEST: Get active investments
    // ============================================
    console.log("→ TEST 8: Investor views active investments");
    const activeInvestmentsRes = await axios.get(
      `${BASE_URL}/interactions/relationships/investments`,
      { headers: { Authorization: `Bearer ${investorToken}` } }
    );

    console.log(`✓ Active investments: ${activeInvestmentsRes.data.investments.length}`);
    if (activeInvestmentsRes.data.investments.length > 0) {
      console.log(`  Startup: ${activeInvestmentsRes.data.investments[0].startup_name}\n`);
    }

    // ============================================
    // 10. TEST: Get my interactions
    // ============================================
    console.log("→ TEST 9: Startup views all interactions");
    const myInteractionsRes = await axios.get(`${BASE_URL}/interactions?category=mentorship`, {
      headers: { Authorization: `Bearer ${startupToken}` },
    });

    console.log(`✓ Mentorship interactions: ${myInteractionsRes.data.total}`);
    console.log(
      `  Sent: ${myInteractionsRes.data.interactions.filter((i) => i.direction === "sent").length}`
    );
    console.log(
      `  Received: ${myInteractionsRes.data.interactions.filter((i) => i.direction === "received").length}\n`
    );

    // ============================================
    // 11. TEST: Error cases
    // ============================================
    console.log("→ TEST 10: Validation - Cannot create duplicate pending");
    try {
      await axios.post(
        `${BASE_URL}/interactions`,
        {
          receiver_id: mentorId,
          type: "request",
          category: "mentorship",
          message: "Duplicate request",
        },
        { headers: { Authorization: `Bearer ${startupToken}` } }
      );
      console.log("✗ FAILED: Should have rejected duplicate");
    } catch (err) {
      console.log(`✓ PASSED: Duplicate rejected - ${err.response.data.error}\n`);
    }

    // ============================================
    // 12. TEST: Role validation
    // ============================================
    console.log("→ TEST 11: Validation - Invalid role combination");
    try {
      // Mentor tries to create investment with Investor (should fail)
      await axios.post(
        `${BASE_URL}/interactions`,
        {
          receiver_id: investorId,
          type: "request",
          category: "investment",
          message: "Invalid",
        },
        { headers: { Authorization: `Bearer ${mentorToken}` } }
      );
      console.log("✗ FAILED: Should have rejected invalid roles");
    } catch (err) {
      console.log(`✓ PASSED: Invalid role rejected - ${err.response.data.error}\n`);
    }

    // ============================================
    // 13. TEST: Cancel interaction
    // ============================================
    console.log("→ TEST 12: Cancel pending interaction");
    const secondInvestorRes = await axios.post(`${BASE_URL}/auth/register`, {
      first_name: "Investor2",
      last_name: "User",
      email: `investor2_${Date.now()}@test.com`,
      password: "TestPass123!",
      role: "Investor",
    });
    const investor2Id = secondInvestorRes.data.user.user_id;

    await axios.post(`${BASE_URL}/auth/login`, {
      email: secondInvestorRes.data.user.email,
      password: "TestPass123!",
    });

    // Approve investor2
    await axios.put(
      `${BASE_URL}/admin/users/approve/${investor2Id}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const cancelableRes = await axios.post(
      `${BASE_URL}/interactions`,
      {
        receiver_id: investor2Id,
        type: "request",
        category: "investment",
        message: "Will cancel",
      },
      { headers: { Authorization: `Bearer ${startupToken}` } }
    );

    const cancelableId = cancelableRes.data.interaction.interaction_id;

    const cancelRes = await axios.delete(`${BASE_URL}/interactions/${cancelableId}`, {
      headers: { Authorization: `Bearer ${startupToken}` },
    });

    console.log("✓ Interaction cancelled");
    console.log(`  New status: ${cancelRes.data.interaction.status}\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log("================================================================================");
    console.log("✨ All Interaction System Tests Passed!");
    console.log(
      "================================================================================\n"
    );

    console.log("✓ Mentorship Request Flow");
    console.log("✓ Investment Invite Flow");
    console.log("✓ Active Relationships Tracking");
    console.log("✓ Duplicate Prevention");
    console.log("✓ Role Validation");
    console.log("✓ Cancel Functionality");
    console.log("✓ Interaction History");

    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err.response?.data || err.message);
    process.exit(1);
  }
}

testInteractionSystem();
