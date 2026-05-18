const bcrypt = require("bcrypt");
const request = require("supertest");
const pool = require("../config/db");
const app = require("../../src/app");

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}@test.com`;
}

function makePdfBuffer(label) {
  return Buffer.from(`%PDF-1.4\n${label}\n%%EOF`, "utf8");
}

function makePngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3ZKxkAAAAASUVORK5CYII=",
    "base64"
  );
}

async function registerUser(role, firstName, lastName, email) {
  const response = await request(app).post("/api/auth/register").send({
    first_name: firstName,
    last_name: lastName,
    email,
    password: "Demo123!",
    role,
  });
  if (response.statusCode !== 201) {
    throw new Error(
      `${role} registration failed: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body.user;
}

async function loginUser(email) {
  const response = await request(app).post("/api/auth/login").send({ email, password: "Demo123!" });
  if (response.statusCode !== 200) {
    throw new Error(
      `Login failed for ${email}: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body.token;
}

async function approveUser(adminToken, userId) {
  const response = await request(app)
    .put(`/api/admin/users/approve/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ comment: "Approved after profile upload smoke test" });
  if (![200, 201].includes(response.statusCode)) {
    throw new Error(
      `Approval failed for ${userId}: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body;
}

async function createStartupProfile(token) {
  return request(app)
    .post("/api/startups/profile")
    .set("Authorization", `Bearer ${token}`)
    .field("startup_name", "Addis Supply Hub")
    .field("industry", "Logistics")
    .field("description", "B2B logistics and fulfillment platform for Ethiopian merchants.")
    .field("business_stage", "Seed")
    .field("founded_year", "2024")
    .field("team_size", "6")
    .field("location", "Addis Ababa")
    .field("website", "https://addissupplyhub.example")
    .field("funding_needed", "150000")
    .attach("pitch_deck", makePdfBuffer("Startup pitch deck"), {
      filename: "startup-pitch-deck.pdf",
      contentType: "application/pdf",
    })
    .attach("business_plan", makePdfBuffer("Startup business plan"), {
      filename: "startup-business-plan.pdf",
      contentType: "application/pdf",
    })
    .attach("logo", makePngBuffer(), {
      filename: "startup-logo.png",
      contentType: "image/png",
    })
    .attach("profile_image", makePngBuffer(), {
      filename: "startup-profile.png",
      contentType: "image/png",
    });
}

async function createMentorProfile(token) {
  return request(app)
    .post("/api/mentors/profile")
    .set("Authorization", `Bearer ${token}`)
    .field("headline", "Ethiopian growth mentor and product strategist")
    .field("expertise", "Product strategy, fundraising, go-to-market")
    .field("years_experience", "10")
    .field("hourly_rate", "250")
    .field("country", "Ethiopia")
    .field("bio", "Helps founders improve execution, pitch quality, and investor readiness.")
    .field("availability", JSON.stringify({ monday: ["09:00-12:00"], thursday: ["13:00-17:00"] }))
    .attach("cv", makePdfBuffer("Mentor CV"), {
      filename: "mentor-cv.pdf",
      contentType: "application/pdf",
    })
    .attach("certifications", makePdfBuffer("Mentor certification"), {
      filename: "mentor-certification.pdf",
      contentType: "application/pdf",
    })
    .attach("profile_image", makePngBuffer(), {
      filename: "mentor-profile.png",
      contentType: "image/png",
    })
    .attach("government_id", makePdfBuffer("Mentor government ID"), {
      filename: "mentor-id.pdf",
      contentType: "application/pdf",
    });
}

async function createInvestorProfile(token) {
  return request(app)
    .post("/api/investors/profile")
    .set("Authorization", `Bearer ${token}`)
    .field("investor_type", "Angel")
    .field("organization_name", "Asmara Growth Partners")
    .field("investment_budget", "500000")
    .field("preferred_industry", "Logistics")
    .field("investment_stage", "Seed")
    .field("country", "Ethiopia")
    .field("portfolio_size", "7")
    .field("bio", "Invests in practical businesses with strong unit economics.")
    .attach("profile_image", makePngBuffer(), {
      filename: "investor-profile.png",
      contentType: "image/png",
    })
    .attach("portfolio", makePdfBuffer("Investor portfolio"), {
      filename: "investor-portfolio.pdf",
      contentType: "application/pdf",
    })
    .attach("government_id", makePdfBuffer("Investor government ID"), {
      filename: "investor-id.pdf",
      contentType: "application/pdf",
    })
    .attach("business_registration", makePdfBuffer("Business registration"), {
      filename: "investor-business-registration.pdf",
      contentType: "application/pdf",
    })
    .attach("trade_license", makePdfBuffer("Trade license"), {
      filename: "investor-trade-license.pdf",
      contentType: "application/pdf",
    })
    .attach("tin_certificate", makePdfBuffer("TIN certificate"), {
      filename: "investor-tin.pdf",
      contentType: "application/pdf",
    });
}

async function main() {
  const adminEmail = process.env.PROFILE_SMOKE_ADMIN_EMAIL || "admin@startupconnect.test";
  const mentorEmail = uniqueEmail("smoke_mentor");
  const startupEmail = uniqueEmail("smoke_startup");
  const investorEmail = uniqueEmail("smoke_investor");

  const mentor = await registerUser("Mentor", "Aster", "Bekele", mentorEmail);
  const startup = await registerUser("Startup", "Meklit", "Tadesse", startupEmail);
  const investor = await registerUser("Investor", "Kalkidan", "Mekonnen", investorEmail);

  const adminToken = await loginUser(adminEmail);
  const mentorToken = await loginUser(mentorEmail);
  const startupToken = await loginUser(startupEmail);
  const investorToken = await loginUser(investorEmail);

  await createStartupProfile(startupToken);
  await createMentorProfile(mentorToken);
  await createInvestorProfile(investorToken);

  await approveUser(adminToken, mentor.user_id);
  await approveUser(adminToken, startup.user_id);
  await approveUser(adminToken, investor.user_id);

  const [startupProfile, mentorProfile, investorProfile] = await Promise.all([
    request(app).get("/api/startups/profile").set("Authorization", `Bearer ${startupToken}`),
    request(app).get("/api/mentors/profile").set("Authorization", `Bearer ${mentorToken}`),
    request(app).get("/api/investors/profile").set("Authorization", `Bearer ${investorToken}`),
  ]);

  if (startupProfile.statusCode !== 200 || (startupProfile.body.documents || []).length < 3) {
    throw new Error(
      `Startup profile smoke failed: ${startupProfile.statusCode} ${JSON.stringify(startupProfile.body)}`
    );
  }
  if (mentorProfile.statusCode !== 200 || (mentorProfile.body.documents || []).length < 3) {
    throw new Error(
      `Mentor profile smoke failed: ${mentorProfile.statusCode} ${JSON.stringify(mentorProfile.body)}`
    );
  }
  if (investorProfile.statusCode !== 200 || (investorProfile.body.documents || []).length < 4) {
    throw new Error(
      `Investor profile smoke failed: ${investorProfile.statusCode} ${JSON.stringify(investorProfile.body)}`
    );
  }

  const adminDashboard = await request(app)
    .get("/api/dashboard/admin")
    .set("Authorization", `Bearer ${adminToken}`);
  const adminUsersPending = await request(app)
    .get("/api/admin/users/pending")
    .set("Authorization", `Bearer ${adminToken}`);
  const adminSecurityAnalytics = await request(app)
    .get("/api/admin/security/analytics")
    .set("Authorization", `Bearer ${adminToken}`);

  if (adminDashboard.statusCode !== 200) {
    throw new Error(
      `Admin dashboard failed: ${adminDashboard.statusCode} ${JSON.stringify(adminDashboard.body)}`
    );
  }
  if (adminUsersPending.statusCode !== 200) {
    throw new Error(
      `Admin users pending failed: ${adminUsersPending.statusCode} ${JSON.stringify(adminUsersPending.body)}`
    );
  }
  if (adminSecurityAnalytics.statusCode !== 200) {
    throw new Error(
      `Admin security analytics failed: ${adminSecurityAnalytics.statusCode} ${JSON.stringify(adminSecurityAnalytics.body)}`
    );
  }

  console.log(
    JSON.stringify(
      {
        adminEmail,
        mentorId: mentor.user_id,
        startupId: startup.user_id,
        investorId: investor.user_id,
        startupDocuments: startupProfile.body.documents?.length || 0,
        mentorDocuments: mentorProfile.body.documents?.length || 0,
        investorDocuments: investorProfile.body.documents?.length || 0,
        adminDashboardStatus: adminDashboard.statusCode,
        adminUsersPendingStatus: adminUsersPending.statusCode,
        adminSecurityAnalyticsStatus: adminSecurityAnalytics.statusCode,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error("PROFILE_UPLOAD_SMOKE_FAILED", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => null);
  });
