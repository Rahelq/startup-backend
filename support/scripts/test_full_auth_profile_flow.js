/**
 * Full Authentication & Profile Management Regression Test
 * Tests: registration → login → profile creation → updates → discovery → approval workflow
 * Covers all three roles: Mentor, Startup, Investor
 */

const axios = require("axios");

const BASE_URL = "http://localhost:3000";
const API = {
  REGISTER: `${BASE_URL}/api/auth/register`,
  LOGIN: `${BASE_URL}/api/auth/login`,
  APPROVE: (userId) => `${BASE_URL}/api/admin/users/approve/${userId}`,
  USER_PROFILE: `${BASE_URL}/api/users/profile`,
  MENTOR_PROFILE: `${BASE_URL}/api/mentors/profile`,
  MENTOR_DISCOVER: `${BASE_URL}/api/mentors`,
  STARTUP_PROFILE: `${BASE_URL}/api/startups/profile`,
  STARTUP_DISCOVER: `${BASE_URL}/api/startups/discover`,
  INVESTOR_PROFILE: `${BASE_URL}/api/investors/profile`,
  INVESTOR_DISCOVER: `${BASE_URL}/api/investors`,
};

let testResults = [];

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    success: "✓",
    error: "✗",
    info: "→",
    warn: "⚠",
  }[type];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordResult(testName, passed, details = "") {
  testResults.push({ testName, passed, details });
  if (passed) {
    log(`PASS: ${testName}`, "success");
  } else {
    log(`FAIL: ${testName} - ${details}`, "error");
  }
}

async function testAuthFlow() {
  log("=== PHASE 1: AUTHENTICATION FLOW ===", "info");

  try {
    // Register Mentor
    log("Registering mentor user...", "info");
    const mentorEmail = `mentor_${Date.now()}@test.com`;
    const mentorReg = await axios.post(API.REGISTER, {
      first_name: "Dr",
      last_name: "Mentor",
      email: mentorEmail,
      password: "TestPass123",
      role: "Mentor",
      phone_number: "+1234567890",
    });
    const mentorUserId = mentorReg.data.user && mentorReg.data.user.user_id;
    recordResult("Mentor Registration", true);

    // Register Startup
    log("Registering startup user...", "info");
    const startupEmail = `startup_${Date.now() + 1}@test.com`;
    const startupReg = await axios.post(API.REGISTER, {
      first_name: "Alice",
      last_name: "Founder",
      email: startupEmail,
      password: "TestPass456",
      role: "Startup",
      phone_number: "+1234567891",
    });
    const startupUserId = startupReg.data.user && startupReg.data.user.user_id;
    recordResult("Startup Registration", true);

    // Register Investor
    log("Registering investor user...", "info");
    const investorEmail = `investor_${Date.now() + 2}@test.com`;
    const investorReg = await axios.post(API.REGISTER, {
      first_name: "Bob",
      last_name: "Investor",
      email: investorEmail,
      password: "TestPass789",
      role: "Investor",
      phone_number: "+1234567892",
    });
    const investorUserId = investorReg.data.user && investorReg.data.user.user_id;
    recordResult("Investor Registration", true);

    return {
      mentorUserId,
      startupUserId,
      investorUserId,
      mentorEmail,
      startupEmail,
      investorEmail,
    };
  } catch (err) {
    recordResult("Authentication Flow", false, err.message);
    throw err;
  }
}

async function testProfileCreation(users) {
  log("=== PHASE 2: PROFILE CREATION ===", "info");

  try {
    // Login to get tokens
    const mentorLogin = await axios.post(API.LOGIN, {
      email: users.mentorEmail,
      password: "TestPass123",
    });
    const mentorToken = mentorLogin.data.token; // Use 'token' not 'access_token'

    const startupLogin = await axios.post(API.LOGIN, {
      email: users.startupEmail,
      password: "TestPass456",
    });
    const startupToken = startupLogin.data.token;

    const investorLogin = await axios.post(API.LOGIN, {
      email: users.investorEmail,
      password: "TestPass789",
    });
    const investorToken = investorLogin.data.token;

    // Create Mentor Profile
    log("Creating mentor profile...", "info");
    await axios.post(
      API.MENTOR_PROFILE,
      {
        headline: "Senior Tech Mentor",
        expertise: "Full Stack Development, AI/ML",
        years_experience: 10,
        hourly_rate: 150,
        country: "USA",
        bio: "Passionate about helping early-stage startups scale their tech teams",
      },
      {
        headers: { Authorization: `Bearer ${mentorToken}` },
      }
    );
    recordResult("Mentor Profile Creation", true);

    // Create Startup Profile
    log("Creating startup profile...", "info");
    await axios.post(
      API.STARTUP_PROFILE,
      {
        startup_name: "TechVenture Inc",
        industry: "SaaS",
        description: "AI-powered analytics platform for e-commerce",
        business_stage: "Series A",
        founded_year: 2023,
        team_size: 12,
        location: "San Francisco, CA",
        website: "https://techventure.example.com",
        funding_needed: 500000,
      },
      {
        headers: { Authorization: `Bearer ${startupToken}` },
      }
    );
    recordResult("Startup Profile Creation", true);

    // Create Investor Profile
    log("Creating investor profile...", "info");
    await axios.post(
      API.INVESTOR_PROFILE,
      {
        investor_type: "Venture Capital",
        organization_name: "TechFund Partners",
        investment_budget: 5000000,
        preferred_industry: "Technology",
        investment_stage: "Series A",
        country: "USA",
        portfolio_size: 15,
        bio: "Investing in innovative tech startups",
        funding_range_min: 500000,
        funding_range_max: 5000000,
      },
      {
        headers: { Authorization: `Bearer ${investorToken}` },
      }
    );
    recordResult("Investor Profile Creation", true);

    return { mentorToken, startupToken, investorToken };
  } catch (err) {
    recordResult("Profile Creation", false, err.message);
    throw err;
  }
}

async function testProfileRetrieval(tokens) {
  log("=== PHASE 3: PROFILE RETRIEVAL ===", "info");

  try {
    // Get Mentor Profile
    log("Retrieving mentor profile...", "info");
    const mentorGet = await axios.get(API.MENTOR_PROFILE, {
      headers: { Authorization: `Bearer ${tokens.mentorToken}` },
    });
    recordResult("Mentor Profile Get", mentorGet.data && mentorGet.data.headline);

    // Get Startup Profile
    log("Retrieving startup profile...", "info");
    const startupGet = await axios.get(API.STARTUP_PROFILE, {
      headers: { Authorization: `Bearer ${tokens.startupToken}` },
    });
    recordResult("Startup Profile Get", startupGet.data && startupGet.data.startup_name);

    // Get Investor Profile
    log("Retrieving investor profile...", "info");
    const investorGet = await axios.get(API.INVESTOR_PROFILE, {
      headers: { Authorization: `Bearer ${tokens.investorToken}` },
    });
    recordResult("Investor Profile Get", investorGet.data && investorGet.data.organization_name);

    // Get unified user profile (includes role-specific data)
    log("Retrieving unified user profiles...", "info");
    const userProfile = await axios.get(API.USER_PROFILE, {
      headers: { Authorization: `Bearer ${tokens.mentorToken}` },
    });
    recordResult(
      "Unified User Profile Get",
      userProfile.data && userProfile.data.user && userProfile.data.profile
    );
  } catch (err) {
    recordResult("Profile Retrieval", false, err.message);
    throw err;
  }
}

async function testProfileUpdates(tokens) {
  log("=== PHASE 4: PROFILE UPDATES ===", "info");

  try {
    // Update Mentor Profile
    log("Updating mentor profile...", "info");
    const mentorUpdate = await axios.put(
      API.MENTOR_PROFILE,
      {
        headline: "Principal Tech Mentor - Updated",
        hourly_rate: 200,
        bio: "Updated bio with more experience",
      },
      {
        headers: { Authorization: `Bearer ${tokens.mentorToken}` },
      }
    );
    recordResult("Mentor Profile Update", mentorUpdate.status === 200);

    // Update Startup Profile
    log("Updating startup profile...", "info");
    const startupUpdate = await axios.put(
      API.STARTUP_PROFILE,
      {
        funding_needed: 750000,
        team_size: 15,
      },
      {
        headers: { Authorization: `Bearer ${tokens.startupToken}` },
      }
    );
    recordResult("Startup Profile Update", startupUpdate.status === 200);

    // Update Investor Profile
    log("Updating investor profile...", "info");
    const investorUpdate = await axios.put(
      API.INVESTOR_PROFILE,
      {
        portfolio_size: 20,
        bio: "Expanded investment focus across multiple sectors",
      },
      {
        headers: { Authorization: `Bearer ${tokens.investorToken}` },
      }
    );
    recordResult("Investor Profile Update", investorUpdate.status === 200);
  } catch (err) {
    recordResult("Profile Updates", false, err.message);
    throw err;
  }
}

async function testDiscoveryVisibility(tokens) {
  log("=== PHASE 5: DISCOVERY VISIBILITY (Before Approval) ===", "info");

  try {
    // Before approval, discovery endpoints should fail or return limited results
    try {
      await axios.get(API.MENTOR_DISCOVER, {
        headers: { Authorization: `Bearer ${tokens.startupToken}` },
      });
      recordResult("Mentor Discovery (PreApproval)", false, "Should require approval");
    } catch (err) {
      recordResult(
        "Mentor Discovery (PreApproval)",
        err.response?.status === 403 || err.response?.status === 401
      );
    }

    try {
      await axios.get(API.INVESTOR_DISCOVER, {
        headers: { Authorization: `Bearer ${tokens.startupToken}` },
      });
      recordResult("Investor Discovery (PreApproval)", false, "Should require approval");
    } catch (err) {
      recordResult(
        "Investor Discovery (PreApproval)",
        err.response?.status === 403 || err.response?.status === 401
      );
    }
  } catch (err) {
    recordResult("Discovery Visibility PreApproval", false, err.message);
  }
}

async function testApprovalWorkflow(users) {
  log("=== PHASE 6: ADMIN APPROVAL WORKFLOW ===", "info");

  try {
    // Create an admin user directly in the database for tests (avoid register endpoint 500)
    log("Creating admin user in DB for approvals...", "info");
    const pool = require("../config/db");
    const bcrypt = require("bcrypt");
    const adminEmail = `admin_${Date.now()}@test.com`;
    const hashed = await bcrypt.hash("AdminPass123", 10);
    const insert = await pool.query(
      "INSERT INTO users (first_name, last_name, email, password_hash, role, is_approved) VALUES($1,$2,$3,$4,$5, true) RETURNING user_id",
      ["Site", "Admin", adminEmail, hashed, "Admin"]
    );
    const adminUserId = insert.rows[0].user_id;
    // create admin record
    await pool.query(
      "INSERT INTO admins (user_id, privilege_level) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
      [adminUserId, 10]
    );

    // Debug: fetch inserted user row
    const check = await pool.query("SELECT * FROM users WHERE user_id = $1", [adminUserId]);
    console.log("Inserted admin row:", check.rows[0]);

    const adminLogin = await axios.post(API.LOGIN, {
      email: adminEmail,
      password: "AdminPass123",
    });
    const adminToken = adminLogin.data.token;
    console.log("Admin logged in, token length:", adminToken && adminToken.length);

    // Approve the test users created earlier
    const toApprove = [users.mentorUserId, users.startupUserId, users.investorUserId];
    for (const id of toApprove) {
      try {
        console.log("Approving user_id:", id);
        const apr = await axios.put(
          API.APPROVE(id),
          {},
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );
        console.log("Approve response:", apr.data);
      } catch (e) {
        console.error("Approve error for", id, e.response?.data || e.message);
        throw e;
      }
    }

    recordResult("Admin Approval Setup", true);
  } catch (err) {
    console.error("Admin approval error response:", err.response?.data || err.message);
    recordResult("Admin Approval Setup", false, err.message || err);
    throw err;
  }
}

async function testPostApprovalDiscovery(tokens) {
  log("=== PHASE 7: POST-APPROVAL DISCOVERY ===", "info");

  try {
    // After admin approval, discovery endpoints should return results for approved profiles
    const mentorDiscover = await axios.get(API.MENTOR_DISCOVER, {
      headers: { Authorization: `Bearer ${tokens.startupToken}` },
    });
    recordResult("Mentor Discovery (PostApproval)", Array.isArray(mentorDiscover.data));

    const investorDiscover = await axios.get(API.INVESTOR_DISCOVER, {
      headers: { Authorization: `Bearer ${tokens.startupToken}` },
    });
    recordResult("Investor Discovery (PostApproval)", Array.isArray(investorDiscover.data));
  } catch (err) {
    recordResult("Post-Approval Discovery", false, err.message);
    throw err;
  }
}

async function printSummary() {
  log("=== TEST SUMMARY ===", "info");

  const passed = testResults.filter((r) => r.passed).length;
  const total = testResults.length;
  const percentage = ((passed / total) * 100).toFixed(2);

  console.log("\n" + "=".repeat(80));
  testResults.forEach((result) => {
    const icon = result.passed ? "✓" : "✗";
    const details = result.details ? ` (${result.details})` : "";
    console.log(`${icon} ${result.testName}${details}`);
  });
  console.log("=".repeat(80));
  console.log(`\nPassed: ${passed}/${total} (${percentage}%)`);

  if (passed === total) {
    log("ALL TESTS PASSED", "success");
  } else {
    log(`${total - passed} test(s) failed`, "warn");
  }
}

async function runAllTests() {
  try {
    log("Starting User Identity & Authentication & Profile Management Regression Tests");
    log("Tests cover: Registration → Login → Profile Creation → Updates → Discovery", "info");

    const users = await testAuthFlow();
    const tokens = await testProfileCreation(users);
    await testProfileRetrieval(tokens);
    await testProfileUpdates(tokens);
    await testDiscoveryVisibility(tokens);
    await testApprovalWorkflow(users);
    await testPostApprovalDiscovery(tokens);

    await printSummary();
  } catch (err) {
    log(`Test suite error: ${err.message}`, "error");
    process.exitCode = 1;
  }
}

runAllTests();
