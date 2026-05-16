const request = require("supertest");
const app = require("../../src/app");

async function login(email, password = "Demo123!") {
  return request(app).post("/api/auth/login").send({ email, password });
}

async function main() {
  try {
    const startupLogin = await login("startup@startupconnect.test");
    const mentorLogin = await login("mentor@startupconnect.test");
    const investorLogin = await login("investor@startupconnect.test");
    const adminLogin = await login("admin@startupconnect.test");

    console.log("login_startup_status=", startupLogin.statusCode);
    console.log("login_mentor_status=", mentorLogin.statusCode);
    console.log("login_investor_status=", investorLogin.statusCode);
    console.log("login_admin_status=", adminLogin.statusCode);

    const startupToken = startupLogin.body?.token;
    const mentorToken = mentorLogin.body?.token;
    const investorToken = investorLogin.body?.token;
    const adminToken = adminLogin.body?.token;

    if (!startupToken || !mentorToken || !investorToken || !adminToken) {
      console.log("PHASE6_SMOKE_FAILED missing token(s)");
      process.exit(1);
    }

    const startupDashboard = await request(app)
      .get("/api/dashboard/startup")
      .set("Authorization", `Bearer ${startupToken}`);
    console.log("startup_dashboard_status=", startupDashboard.statusCode);
    console.log("startup_dashboard_keys=", Object.keys(startupDashboard.body || {}).length);

    const mentorDashboard = await request(app)
      .get("/api/dashboard/mentor")
      .set("Authorization", `Bearer ${mentorToken}`);
    console.log("mentor_dashboard_status=", mentorDashboard.statusCode);
    console.log("mentor_dashboard_keys=", Object.keys(mentorDashboard.body || {}).length);

    const investorDashboard = await request(app)
      .get("/api/dashboard/investor")
      .set("Authorization", `Bearer ${investorToken}`);
    console.log("investor_dashboard_status=", investorDashboard.statusCode);
    console.log("investor_dashboard_keys=", Object.keys(investorDashboard.body || {}).length);

    const adminDashboard = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    console.log("admin_dashboard_status=", adminDashboard.statusCode);
    console.log("admin_dashboard_keys=", Object.keys(adminDashboard.body || {}).length);

    const activityFeed = await request(app)
      .get("/api/activity/feed?scope=related&limit=10")
      .set("Authorization", `Bearer ${startupToken}`);
    console.log("activity_feed_status=", activityFeed.statusCode);
    console.log(
      "activity_feed_count=",
      Array.isArray(activityFeed.body?.items) ? activityFeed.body.items.length : -1
    );

    const activitySummary = await request(app)
      .get("/api/activity/summary")
      .set("Authorization", `Bearer ${startupToken}`);
    console.log("activity_summary_status=", activitySummary.statusCode);
    console.log("activity_summary_total=", activitySummary.body?.total);

    const notificationSummary = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${startupToken}`);
    console.log("notification_unread_status=", notificationSummary.statusCode);
    console.log("notification_unread_count=", notificationSummary.body?.unread);

    console.log("phase6_smoke_complete=", true);
  } catch (error) {
    console.error("PHASE6_SMOKE_FAILED", error.message || error);
    process.exit(1);
  }
}

main();
