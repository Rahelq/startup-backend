const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

describe("Mentorship progress flow", () => {
  let tokenStartup;
  let tokenMentor;
  let startupUserId;
  let mentorUserId;
  let mentorshipRequestId;

  beforeAll(async () => {
    // create test users (approved) and generate JWTs directly
    const u1 = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_approved, verification_status, role) VALUES ('tp-startup@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'TP','Startup', true, true, 'approved', 'Startup') RETURNING user_id"
    );
    const u2 = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_approved, verification_status, role) VALUES ('tp-mentor@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'TP','Mentor', true, true, 'approved', 'Mentor') RETURNING user_id"
    );
    startupUserId = u1.rows[0].user_id;
    mentorUserId = u2.rows[0].user_id;

    await pool.query("INSERT INTO startups (user_id, startup_name) VALUES ($1, 'TP Startup')", [
      startupUserId,
    ]);
    await pool.query("INSERT INTO mentors (user_id, headline) VALUES ($1, 'TP Mentor')", [
      mentorUserId,
    ]);

    // create an interaction + mentorship_request + relationship active
    const ir = await pool.query(
      "INSERT INTO interaction_requests (sender_id, receiver_id, type, category) VALUES ($1,$2,'invite','mentorship') RETURNING interaction_id",
      [mentorUserId, startupUserId]
    );
    const mr = await pool.query(
      "INSERT INTO mentorship_requests (startup_id, mentor_id, subject, message, status) VALUES ((SELECT startup_id FROM startups WHERE user_id=$1),(SELECT mentor_id FROM mentors WHERE user_id=$2),'Test','test', 'accepted') RETURNING mentorship_request_id",
      [startupUserId, mentorUserId]
    );
    mentorshipRequestId = mr.rows[0].mentorship_request_id;
    await pool.query(
      "INSERT INTO mentorship_relationships (mentor_id, startup_id, interaction_request_id, mentorship_request_id, status) VALUES ($1,$2, $3, $4, 'active') ON CONFLICT DO NOTHING",
      [mentorUserId, startupUserId, ir.rows[0].interaction_id, mentorshipRequestId]
    );

    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
    tokenStartup = jwt.sign({ user_id: startupUserId, role: "Startup" }, JWT_SECRET);
    tokenMentor = jwt.sign({ user_id: mentorUserId, role: "Mentor" }, JWT_SECRET);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM mentorship_progress WHERE mentorship_request_id = $1", [
      mentorshipRequestId,
    ]);
    await pool.query("DELETE FROM mentorship_relationships WHERE mentorship_request_id = $1", [
      mentorshipRequestId,
    ]);
    await pool.query("DELETE FROM mentorship_requests WHERE mentorship_request_id = $1", [
      mentorshipRequestId,
    ]);
    await pool.query("DELETE FROM mentors WHERE user_id = $1", [mentorUserId]);
    await pool.query("DELETE FROM startups WHERE user_id = $1", [startupUserId]);
    await pool.query("DELETE FROM users WHERE user_id IN ($1,$2)", [startupUserId, mentorUserId]);
  });

  test("mentor can record progress and startup can fetch it", async () => {
    const rec = await request(app)
      .post("/api/mentorship/progress")
      .set("Authorization", `Bearer ${tokenMentor}`)
      .send({ mentorship_request_id: mentorshipRequestId, notes: "Worked on pitch", rating: 4 });
    expect(rec.status).toBe(201);
    expect(rec.body.progress).toBeDefined();

    const list = await request(app)
      .get(`/api/mentorship/progress?mentorship_request_id=${mentorshipRequestId}`)
      .set("Authorization", `Bearer ${tokenStartup}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.progress)).toBe(true);
    expect(list.body.progress.length).toBeGreaterThan(0);
  });
});
