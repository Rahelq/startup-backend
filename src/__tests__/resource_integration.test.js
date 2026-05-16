const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

describe("Shared resources integration", () => {
  let startupId,
    mentorId,
    startupUserId,
    mentorUserId,
    startupToken,
    mentorToken,
    mentorshipRequestId;

  beforeAll(async () => {
    // create users
    const u1 = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_approved, verification_status, role) VALUES ('rs-startup@example.com','$2b$10$abcdefghijklmnopqrstuv','RS','Startup',true,true,'approved','Startup') RETURNING user_id"
    );
    const u2 = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_approved, verification_status, role) VALUES ('rs-mentor@example.com','$2b$10$abcdefghijklmnopqrstuv','RS','Mentor',true,true,'approved','Mentor') RETURNING user_id"
    );
    startupUserId = u1.rows[0].user_id;
    mentorUserId = u2.rows[0].user_id;

    await pool.query("INSERT INTO startups (user_id, startup_name) VALUES ($1,$2)", [
      startupUserId,
      "RS Startup",
    ]);
    await pool.query("INSERT INTO mentors (user_id, headline) VALUES ($1,$2)", [
      mentorUserId,
      "RS Mentor",
    ]);

    // create mentorship request + active relationship
    const ir = await pool.query(
      `INSERT INTO interaction_requests (sender_id, receiver_id, type, category) VALUES ($1,$2,'invite','mentorship') RETURNING interaction_id`,
      [mentorUserId, startupUserId]
    );
    const mr = await pool.query(
      `INSERT INTO mentorship_requests (startup_id, mentor_id, subject, message, status) VALUES ((SELECT startup_id FROM startups WHERE user_id=$1),(SELECT mentor_id FROM mentors WHERE user_id=$2),'Test','t','accepted') RETURNING mentorship_request_id`,
      [startupUserId, mentorUserId]
    );
    mentorshipRequestId = mr.rows[0].mentorship_request_id;
    await pool.query(
      `INSERT INTO mentorship_relationships (mentor_id, startup_id, interaction_request_id, mentorship_request_id, status) VALUES ($1,$2,$3,$4,'active')`,
      [mentorUserId, startupUserId, ir.rows[0].interaction_id, mentorshipRequestId]
    );

    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
    startupToken = jwt.sign({ user_id: startupUserId, role: "Startup" }, JWT_SECRET);
    mentorToken = jwt.sign({ user_id: mentorUserId, role: "Mentor" }, JWT_SECRET);
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM shared_resources WHERE relationship_id = $1 AND relationship_type = $2",
      [mentorshipRequestId, "mentorship"]
    );
    await pool.query("DELETE FROM mentorship_relationships WHERE mentorship_request_id = $1", [
      mentorshipRequestId,
    ]);
    await pool.query("DELETE FROM mentorship_requests WHERE mentorship_request_id = $1", [
      mentorshipRequestId,
    ]);
    await pool.query(
      "DELETE FROM interaction_requests WHERE sender_id IN ($1,$2) OR receiver_id IN ($1,$2)",
      [startupUserId, mentorUserId]
    );
    await pool.query("DELETE FROM mentors WHERE user_id = $1", [mentorUserId]);
    await pool.query("DELETE FROM startups WHERE user_id = $1", [startupUserId]);
    await pool.query("DELETE FROM users WHERE user_id IN ($1,$2)", [startupUserId, mentorUserId]);
  });

  test("share a link resource and list it", async () => {
    const res = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${mentorToken}`)
      .send({
        relationship_type: "mentorship",
        relationship_id: mentorshipRequestId,
        title: "Guide",
        description: "Helpful guide",
        external_url: "https://example.com/guide",
        resource_type: "link",
      });
    expect(res.status).toBe(201);
    expect(res.body.resource).toBeDefined();

    const list = await request(app)
      .get(`/api/resources?relationship_type=mentorship&relationship_id=${mentorshipRequestId}`)
      .set("Authorization", `Bearer ${startupToken}`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.resources)).toBe(true);
    expect(list.body.resources.length).toBeGreaterThan(0);
  });
});
