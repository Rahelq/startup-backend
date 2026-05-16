const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

describe("Phase3 integration: investment tracking & project activity", () => {
  let startupToken, investorToken, startupUserId, investorUserId, projectId, investmentId;

  beforeAll(async () => {
    // create test users (approved) and generate JWTs directly
    const u1 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_approved, verification_status, role) VALUES ('p3-startup@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'P3','Startup', true, true, 'approved', 'Startup') RETURNING user_id`
    );
    const u2 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_approved, verification_status, role) VALUES ('p3-investor@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'P3','Investor', true, true, 'approved', 'Investor') RETURNING user_id`
    );
    startupUserId = u1.rows[0].user_id;
    investorUserId = u2.rows[0].user_id;

    await pool.query(`INSERT INTO startups (user_id, startup_name) VALUES ($1, $2)`, [
      startupUserId,
      "P3 Startup",
    ]);
    await pool.query(
      `INSERT INTO investors (user_id, organization_name, investor_type) VALUES ($1,$2,$3)`,
      [investorUserId, "P3 Investor", "organization"]
    );

    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
    startupToken = jwt.sign({ user_id: startupUserId, role: "Startup" }, JWT_SECRET);
    investorToken = jwt.sign({ user_id: investorUserId, role: "Investor" }, JWT_SECRET);

    // create an interaction + investment relationship active
    const ir = await pool.query(
      `INSERT INTO interaction_requests (sender_id, receiver_id, type, category) VALUES ($1,$2,'invite','investment') RETURNING interaction_id`,
      [investorUserId, startupUserId]
    );
    const inv = await pool.query(
      `INSERT INTO investment_relationships (investor_id, startup_id, interaction_request_id, funding_amount, equity_percentage, status) VALUES ($1,$2,$3,10000,5,'active') RETURNING investment_id`,
      [investorUserId, startupUserId, ir.rows[0].interaction_id]
    );
    investmentId = inv.rows[0].investment_id;

    // create a project owned by startup
    const pj = await pool.query(
      `INSERT INTO projects (startup_id, project_title, description, funding_goal, status) VALUES ((SELECT startup_id FROM startups WHERE user_id=$1), 'P3 Project', 'desc', 50000, 'active') RETURNING project_id`,
      [startupUserId]
    );
    projectId = pj.rows[0].project_id;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM project_activity_logs WHERE project_id = $1", [projectId]);
    await pool.query("DELETE FROM projects WHERE project_id = $1", [projectId]);
    await pool.query("DELETE FROM investment_tracking WHERE investment_id = $1", [investmentId]);
    await pool.query("DELETE FROM investment_documents WHERE investment_id = $1", [investmentId]);
    await pool.query("DELETE FROM investment_relationships WHERE investment_id = $1", [
      investmentId,
    ]);
    await pool.query(
      "DELETE FROM interaction_requests WHERE sender_id IN ($1,$2) OR receiver_id IN ($1,$2)",
      [startupUserId, investorUserId]
    );
    await pool.query("DELETE FROM investors WHERE user_id = $1", [investorUserId]);
    await pool.query("DELETE FROM startups WHERE user_id = $1", [startupUserId]);
    await pool.query("DELETE FROM users WHERE user_id IN ($1,$2)", [startupUserId, investorUserId]);
  });

  test("investor records tracking event and startup can list it", async () => {
    const rec = await request(app)
      .post(`/api/investment-workflow/investments/${investmentId}/tracking`)
      .set("Authorization", `Bearer ${investorToken}`)
      .send({
        event_type: "term_signed",
        details: { note: "term sheet signed" },
      });
    expect(rec.status).toBe(201);

    const list = await request(app)
      .get(`/api/investment-workflow/investments/${investmentId}/tracking`)
      .set("Authorization", `Bearer ${startupToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.events)).toBe(true);
    expect(list.body.events.length).toBeGreaterThan(0);
  });

  test("project owner records activity and lists it", async () => {
    const act = await request(app)
      .post(`/api/projects-workflow/projects/${projectId}/activity`)
      .set("Authorization", `Bearer ${startupToken}`)
      .send({ action: "milestone_added", metadata: { milestone_id: 1 } });
    expect(act.status).toBe(201);

    const list = await request(app)
      .get(`/api/projects-workflow/projects/${projectId}/activity`)
      .set("Authorization", `Bearer ${startupToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.activities)).toBe(true);
    expect(list.body.activities.length).toBeGreaterThan(0);
  });
});
