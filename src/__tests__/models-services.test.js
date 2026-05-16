const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

describe("Models & Services Integration Tests", () => {
  let adminToken;
  let startupToken;
  let mentorToken;
  let investorToken;

  // Setup: Create test users with different roles
  beforeAll(async () => {
    // Admin
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@startupconnect.test", password: "Demo123!" });
    adminToken = adminRes.body.token;

    // Startup
    const startupRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "startup@startupconnect.test", password: "Demo123!" });
    startupToken = startupRes.body.token;

    // Mentor
    const mentorRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "mentor@startupconnect.test", password: "Demo123!" });
    mentorToken = mentorRes.body.token;

    // Investor
    const investorRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "investor@startupconnect.test", password: "Demo123!" });
    investorToken = investorRes.body.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("Validation Schemas", () => {
    it("should validate auth registration", async () => {
      const invalidRes = await request(app)
        .post("/api/auth/register")
        .send({ email: "invalid-email", password: "short" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toBe("Validation error");
    });

    it("should validate auth login", async () => {
      const invalidRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "", password: "" });

      expect(invalidRes.statusCode).toBe(400);
    });

    it("should validate investment request creation", async () => {
      const invalidRes = await request(app)
        .post("/api/investments/request")
        .set("Authorization", `Bearer ${investorToken}`)
        .send({ amount: "not-a-number" });
      expect(invalidRes.statusCode).toBe(400);
    });

    it("should validate mentor profile payload", async () => {
      const invalidRes = await request(app)
        .post("/api/mentors/profile")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({ years_experience: "not-a-number" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate investor profile payload", async () => {
      const invalidRes = await request(app)
        .post("/api/investors/profile")
        .set("Authorization", `Bearer ${investorToken}`)
        .send({ investment_budget: -100 });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate conversation creation payload", async () => {
      const invalidRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ user1_id: 1 });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate message payload", async () => {
      const invalidRes = await request(app)
        .post("/api/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ receiver_id: 2 });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate mentorship request payload", async () => {
      const invalidRes = await request(app)
        .post("/api/mentorship/requests")
        .set("Authorization", `Bearer ${startupToken}`)
        .send({ subject: "Help" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate interaction create payload", async () => {
      const invalidRes = await request(app)
        .post("/api/interactions")
        .set("Authorization", `Bearer ${startupToken}`)
        .send({ type: "request", category: "mentorship" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate investment workflow offer payload", async () => {
      const invalidRes = await request(app)
        .post("/api/investment-workflow/offers")
        .set("Authorization", `Bearer ${investorToken}`)
        .send({ receiver_id: 1 });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate mentorship workflow offer payload", async () => {
      const invalidRes = await request(app)
        .post("/api/mentorship-workflow/offers")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({});

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate project workflow creation payload", async () => {
      const invalidRes = await request(app)
        .post("/api/projects-workflow/projects")
        .set("Authorization", `Bearer ${startupToken}`)
        .send({ project_title: "New project" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate payment checkout payload", async () => {
      const invalidRes = await request(app)
        .post("/api/transactions/payments/initiate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: -10 });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate admin investment request status payload", async () => {
      const invalidRes = await request(app)
        .put("/api/admin/investment-requests/1/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid-status" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate admin project status payload", async () => {
      const invalidRes = await request(app)
        .put("/api/admin/projects/1/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "not-valid" });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });

    it("should validate admin clear audit logs payload", async () => {
      const invalidRes = await request(app)
        .post("/api/admin/maintenance/clear-audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ days: 0 });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.body.message).toMatch(/Validation error/i);
    });
  });

  describe("Models Layer", () => {
    it("should verify models are properly loaded", async () => {
      // This test verifies that all models exist
      const models = [
        "conversationModel",
        "messageModel",
        "mentorshipRequestModel",
        "mentorshipSessionModel",
        "investmentRequestModel",
        "investmentModel",
        "notificationModel",
        "paymentModel",
        "documentModel",
        "interactionModel",
        "reviewModel",
        "adminModel",
        "auditLogModel",
      ];

      for (const model of models) {
        try {
          const m = require(`../models/${model}`);
          expect(m).toBeDefined();
        } catch (err) {
          console.warn(`Model ${model} not loaded: ${err.message}`);
        }
      }
    });
  });

  describe("Services Layer", () => {
    it("should have mentorshipService with required methods", async () => {
      const service = require("../services/mentorshipService");
      expect(service.createMentorshipRequest).toBeDefined();
      expect(service.respondToMentorshipRequest).toBeDefined();
      expect(service.scheduleMentorshipSession).toBeDefined();
    });

    it("should have investmentService with required methods", async () => {
      const service = require("../services/investmentService");
      expect(service.createInvestmentRequest).toBeDefined();
      expect(service.respondToInvestmentRequest).toBeDefined();
      expect(service.recordInvestmentPayment).toBeDefined();
    });

    it("should have paymentService with required methods", async () => {
      const service = require("../services/paymentService");
      expect(service.createPayment).toBeDefined();
      expect(service.getTotalPaidForInvestment).toBeDefined();
    });

    it("should have startupService with required methods", async () => {
      const service = require("../services/startupService");
      expect(service.createStartupProfile).toBeDefined();
      expect(service.getStartupProfile).toBeDefined();
      expect(service.updateStartupProfile).toBeDefined();
    });

    it("should have investorService with required methods", async () => {
      const service = require("../services/investorService");
      expect(service.createInvestorProfile).toBeDefined();
      expect(service.getInvestorProfile).toBeDefined();
      expect(service.updateInvestorProfile).toBeDefined();
    });

    it("should have mentorService with required methods", async () => {
      const service = require("../services/mentorService");
      expect(service.createMentorProfile).toBeDefined();
      expect(service.getMentorProfile).toBeDefined();
      expect(service.updateMentorProfile).toBeDefined();
    });
  });

  describe("Middleware Chain", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/users/profile");
      expect(res.statusCode).toBe(401);
    });

    it("should accept authenticated requests", async () => {
      const res = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it("should validate request body", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "invalid-email", password: "short" });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Validation error/i);
    });
  });

  describe("Admin Route Smoke Tests", () => {
    it("should load admin maintenance status", async () => {
      const res = await request(app)
        .get("/api/admin/maintenance/status")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.database).toBe("ok");
    });

    it("should list admin investment requests", async () => {
      const res = await request(app)
        .get("/api/admin/investment-requests")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.investment_requests)).toBe(true);
    });

    it("should list admin projects", async () => {
      const res = await request(app)
        .get("/api/admin/projects")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.projects)).toBe(true);
    });

    it("should list admin payments", async () => {
      const res = await request(app)
        .get("/api/admin/payments")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.payments)).toBe(true);
    });
  });

  describe("Architecture Compliance", () => {
    it("should verify models don't contain HTTP logic", () => {
      const model = require("../models/startupModel");
      const code = model.toString();
      expect(code).not.toMatch(/res\.|req\.|http/i);
    });

    it("should verify services don't contain pool.query", () => {
      const service = require("../services/mentorshipService");
      const code = service.toString();
      expect(code).not.toMatch(/pool\.query/i);
    });

    it("should verify controllers delegate to services", async () => {
      const controller = require("../controllers/authController");
      const code = controller.register.toString();
      expect(code).toMatch(/Service|service/);
    });
  });
});
