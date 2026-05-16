const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

describe("Admin Security Endpoints", () => {
  let adminUser, token;

  beforeAll(async () => {
    const email = `admin${Date.now()}@example.com`;
    const res = await request(app).post("/api/auth/register").send({
      first_name: "Admin",
      last_name: "User",
      email,
      password: "AdminPass123",
    });
    adminUser = res.body.user;
    // promote to Admin role directly in DB (tests run against test DB)
    await pool.query("UPDATE users SET role = 'Admin' WHERE user_id = $1", [adminUser.user_id]);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "AdminPass123" });
    token = login.body.token;
  });

  afterAll(async () => {
    if (adminUser) {
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [adminUser.user_id]);
      await pool.query("DELETE FROM users WHERE user_id = $1", [adminUser.user_id]);
    }
    await pool.end();
  });

  it("GET /api/admin/security/analytics returns analytics", async () => {
    const res = await request(app)
      .get("/api/admin/security/analytics")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("data");
    const data = res.body.data;
    expect(data).toHaveProperty("total_logins_last_24h");
    expect(data).toHaveProperty("failed_logins_last_24h");
    expect(data).toHaveProperty("unique_failed_users_24h");
    expect(data).toHaveProperty("active_sessions_count");
    expect(data).toHaveProperty("topDevices");
  });
});
