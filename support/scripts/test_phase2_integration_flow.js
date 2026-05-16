const axios = require("axios");
const pool = require("../../src/config/db");
const bcrypt = require("bcrypt");

const BASE = "http://localhost:3000";

async function run() {
  try {
    console.log("Phase2 integration smoke test starting");

    // Register Mentor
    const mentorEmail = `p2_mentor_${Date.now()}@test.com`;
    const mentorReg = await axios.post(`${BASE}/api/auth/register`, {
      first_name: "P2",
      last_name: "Mentor",
      email: mentorEmail,
      password: "Pass1234",
      role: "Mentor",
    });
    const mentorId = mentorReg.data.user.user_id;

    // Register Startup
    const startupEmail = `p2_startup_${Date.now()}@test.com`;
    const startupReg = await axios.post(`${BASE}/api/auth/register`, {
      first_name: "P2",
      last_name: "Startup",
      email: startupEmail,
      password: "Pass1234",
      role: "Startup",
    });
    const startupId = startupReg.data.user.user_id;

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

    // Login admin
    const adminLogin = await axios.post(`${BASE}/api/auth/login`, {
      email: adminEmail,
      password: "AdminPass",
    });
    const adminToken = adminLogin.data.token;

    // Approve mentor and startup
    await axios.put(
      `${BASE}/api/admin/users/approve/${mentorId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.put(
      `${BASE}/api/admin/users/approve/${startupId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Login mentor & startup
    const mLogin = await axios.post(`${BASE}/api/auth/login`, {
      email: mentorEmail,
      password: "Pass1234",
    });
    const sLogin = await axios.post(`${BASE}/api/auth/login`, {
      email: startupEmail,
      password: "Pass1234",
    });
    const mToken = mLogin.data.token;
    const sToken = sLogin.data.token;

    // Create profiles
    await axios.post(
      `${BASE}/api/mentors/profile`,
      { headline: "P2 Mentor", expertise: "Testing" },
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    await axios.post(
      `${BASE}/api/startups/profile`,
      { startup_name: "P2 Startup", industry: "SaaS" },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );

    // Startup sends mentorship request to Mentor
    const createInteraction = await axios.post(
      `${BASE}/api/interactions`,
      {
        receiver_id: mentorId,
        type: "request",
        category: "mentorship",
        message: "Please mentor us",
      },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );
    const interactionId = createInteraction.data.interaction.interaction_id;
    console.log("Interaction created", interactionId);

    // Mentor accepts
    await axios.put(
      `${BASE}/api/interactions/${interactionId}/respond`,
      { status: "accepted" },
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    console.log("Interaction accepted");

    // Check relationships
    const rels = await axios.get(`${BASE}/api/interactions/relationships/mentorships`, {
      headers: { Authorization: `Bearer ${sToken}` },
    });
    if (!Array.isArray(rels.data.mentorships) || rels.data.mentorships.length === 0)
      throw new Error("No mentorship relationship found");
    const mentorship = rels.data.mentorships[0];
    console.log("Mentorship relationship created:", mentorship.mentorship_id);

    // Mentor creates proposal
    const prop = await axios.post(
      `${BASE}/api/connection/mentorship-proposals`,
      {
        mentorship_id: mentorship.mentorship_id,
        title: "Initial Proposal",
        proposal_text: "I will mentor for 8 weeks",
        expected_outcomes: { goals: ["advice"] },
        estimated_weeks: 8,
      },
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    const proposalId = prop.data.proposal.mentorship_proposal_id;
    console.log("Proposal created:", proposalId);

    // Create negotiation
    const neg = await axios.post(
      `${BASE}/api/connection/negotiations`,
      {
        parent_type: "mentorship_proposal",
        parent_id: proposalId,
        message: "Can we adjust to 10 weeks?",
      },
      { headers: { Authorization: `Bearer ${sToken}` } }
    );
    console.log(
      "Negotiation created:",
      neg.data.negotiation.negotiation_id || neg.data.negotiation.negotiation_id === 0
        ? neg.data.negotiation.negotiation_id
        : "(id unknown)"
    );

    // List negotiations
    const list = await axios.get(
      `${BASE}/api/connection/negotiations/mentorship_proposal/${proposalId}`,
      { headers: { Authorization: `Bearer ${mToken}` } }
    );
    if (!Array.isArray(list.data.negotiations) || list.data.negotiations.length === 0)
      throw new Error("No negotiations found");

    console.log("Negotiations listed:", list.data.negotiations.length);

    console.log("Phase2 integration smoke test completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Phase2 integration smoke test failed:", err.response?.data || err.message);
    process.exit(2);
  }
}

run();
