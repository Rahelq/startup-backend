const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

// Test suite for auth endpoints
describe("Auth Endpoints", () => {
  let createdUserId;

  // Clean up test data
  afterAll(async () => {
    if (createdUserId) {
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [createdUserId]);
      await pool.query("DELETE FROM users WHERE user_id = $1", [createdUserId]);
    }
    await pool.end();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          first_name: "Test",
          last_name: "User",
          email: `testuser${Date.now()}@example.com`,
          password: "TestPassword123",
          role: "Startup",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
      createdUserId = res.body.user.user_id;
    });

    it("should reject duplicate email", async () => {
      const email = `testdup${Date.now()}@example.com`;
      await request(app).post("/api/auth/register").send({
        first_name: "Test",
        last_name: "User",
        email,
        password: "TestPassword123",
      });

      const res = await request(app).post("/api/auth/register").send({
        first_name: "Test",
        last_name: "User",
        email,
        password: "TestPassword123",
      });

      expect(res.statusCode).toBe(409);
    });

    it("should reject invalid email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        first_name: "Test",
        last_name: "User",
        email: "invalidemail",
        password: "TestPassword123",
      });

      expect(res.statusCode).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          first_name: "Test",
          last_name: "User",
          email: `test${Date.now()}@example.com`,
          password: "short",
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    let testEmail, testPassword;

    beforeAll(async () => {
      testEmail = `login${Date.now()}@example.com`;
      testPassword = "TestPassword123";
      await request(app).post("/api/auth/register").send({
        first_name: "Login",
        last_name: "Test",
        email: testEmail,
        password: testPassword,
      });
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body.user.email).toBe(testEmail);
    });

    it("should reject invalid password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: testEmail,
        password: "WrongPassword",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should reject non-existent user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "TestPassword123",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/users/profile", () => {
    let token;
    let testEmail;

    beforeAll(async () => {
      testEmail = `profile${Date.now()}@example.com`;
      const res = await request(app).post("/api/auth/register").send({
        first_name: "Profile",
        last_name: "Test",
        email: testEmail,
        password: "TestPassword123",
      });
      token = res.body.token;
    });

    it("should return user profile with valid token", async () => {
      const res = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty("user_id");
    });
  });
});
