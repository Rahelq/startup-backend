const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

describe("Settings API", () => {
  let user, token;

  beforeAll(async () => {
    const email = `settings${Date.now()}@example.com`;
    const res = await request(app).post("/api/auth/register").send({
      first_name: "Set",
      last_name: "Ting",
      email,
      password: "TestPassword123",
    });
    user = res.body.user;
    token = res.body.token;
  });

  afterAll(async () => {
    if (user) {
      await pool.query("DELETE FROM user_settings WHERE user_id = $1", [user.user_id]);
      await pool.query("DELETE FROM privacy_settings WHERE user_id = $1", [user.user_id]);
      await pool.query("DELETE FROM notification_preferences WHERE user_id = $1", [user.user_id]);
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [user.user_id]);
      await pool.query("DELETE FROM users WHERE user_id = $1", [user.user_id]);
    }
    await pool.end();
  });

  test("GET/PUT settings", async () => {
    const g = await request(app).get("/api/settings").set("Authorization", `Bearer ${token}`);
    expect(g.status).toBe(200);
    expect(g.body.data).toBeDefined();

    const upd = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ timezone: "America/New_York", language: "en" });
    expect(upd.status).toBe(200);
    expect(upd.body.data.timezone).toBe("America/New_York");

    const g2 = await request(app).get("/api/settings").set("Authorization", `Bearer ${token}`);
    expect(g2.status).toBe(200);
    expect(g2.body.data.timezone).toBe("America/New_York");
  });

  test("GET/PUT privacy", async () => {
    const g = await request(app)
      .get("/api/settings/privacy")
      .set("Authorization", `Bearer ${token}`);
    expect(g.status).toBe(200);

    const upd = await request(app)
      .put("/api/settings/privacy")
      .set("Authorization", `Bearer ${token}`)
      .send({ profile_visibility: "connections", show_email: true });
    expect(upd.status).toBe(200);
    expect(upd.body.data.profile_visibility).toBe("connections");

    const g2 = await request(app)
      .get("/api/settings/privacy")
      .set("Authorization", `Bearer ${token}`);
    expect(g2.status).toBe(200);
    expect(g2.body.data.profile_visibility).toBe("connections");
  });

  test("GET/PUT notification preferences", async () => {
    const g = await request(app)
      .get("/api/settings/notifications/preferences")
      .set("Authorization", `Bearer ${token}`);
    expect(g.status).toBe(200);

    const upd = await request(app)
      .put("/api/settings/notifications/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ channels: { email: true }, preferences: { digest: "daily" } });
    expect(upd.status).toBe(200);
    expect(upd.body.data.channels.email).toBe(true);

    const g2 = await request(app)
      .get("/api/settings/notifications/preferences")
      .set("Authorization", `Bearer ${token}`);
    expect(g2.status).toBe(200);
    expect(g2.body.data.channels.email).toBe(true);
  });
});
