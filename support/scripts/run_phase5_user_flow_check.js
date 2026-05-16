const request = require("supertest");
const app = require("../../src/app");
const pool = require("../../src/config/db");

async function login(email, password = "Demo123!") {
  return request(app).post("/api/auth/login").send({ email, password });
}

async function main() {
  try {
    const startupLogin = await login("startup@startupconnect.test");
    const mentorLogin = await login("mentor@startupconnect.test");
    const investorLogin = await login("investor@startupconnect.test");

    console.log("login_startup_status=", startupLogin.statusCode);
    console.log("login_mentor_status=", mentorLogin.statusCode);
    console.log("login_investor_status=", investorLogin.statusCode);

    if (!startupLogin.body?.token || !mentorLogin.body?.token || !investorLogin.body?.token) {
      console.log("FLOW_ABORT: missing login token(s)");
      process.exit(1);
    }

    const startupId = startupLogin.body.user.user_id;
    const mentorId = mentorLogin.body.user.user_id;
    const investorId = investorLogin.body.user.user_id;
    const startupToken = startupLogin.body.token;
    const mentorToken = mentorLogin.body.token;
    const investorToken = investorLogin.body.token;

    const mentorshipRel = await pool.query(
      `SELECT mentorship_id, mentor_id, startup_id, status
       FROM mentorship_relationships
       WHERE status = 'active' AND startup_id = $1
       ORDER BY mentorship_id DESC LIMIT 1`,
      [startupId]
    );

    const investmentRel = await pool.query(
      `SELECT investment_id, investor_id, startup_id, status
       FROM investment_relationships
       WHERE status IN ('active','accepted','countered','completed') AND investor_id = $1
       ORDER BY investment_id DESC LIMIT 1`,
      [investorId]
    );

    console.log("has_active_mentorship=", mentorshipRel.rowCount > 0);
    console.log("has_active_investment=", investmentRel.rowCount > 0);

    if (!mentorshipRel.rowCount) {
      const createInteraction = await request(app)
        .post("/api/interactions")
        .set("Authorization", `Bearer ${startupToken}`)
        .send({
          receiver_id: mentorId,
          type: "request",
          category: "mentorship",
          message: "Phase5 transaction flow relationship setup",
        });

      console.log("create_mentorship_interaction_status=", createInteraction.statusCode);
      const interactionId = createInteraction.body?.interaction?.interaction_id;
      if (interactionId) {
        const respondInteraction = await request(app)
          .put(`/api/interactions/${interactionId}/respond`)
          .set("Authorization", `Bearer ${mentorToken}`)
          .send({ status: "accepted" });
        console.log("respond_mentorship_interaction_status=", respondInteraction.statusCode);
      }
    }

    if (!investmentRel.rowCount) {
      const createInteraction = await request(app)
        .post("/api/interactions")
        .set("Authorization", `Bearer ${investorToken}`)
        .send({
          receiver_id: startupId,
          type: "invite",
          category: "investment",
          message: "Phase5 transaction flow relationship setup",
        });

      console.log("create_investment_interaction_status=", createInteraction.statusCode);
      const interactionId = createInteraction.body?.interaction?.interaction_id;
      if (interactionId) {
        const respondInteraction = await request(app)
          .put(`/api/interactions/${interactionId}/respond`)
          .set("Authorization", `Bearer ${startupToken}`)
          .send({ status: "accepted" });
        console.log("respond_investment_interaction_status=", respondInteraction.statusCode);
      }
    }

    const mentorshipRelAfter = await pool.query(
      `SELECT mentorship_id, mentor_id, startup_id, status
       FROM mentorship_relationships
       WHERE status = 'active' AND startup_id = $1
       ORDER BY mentorship_id DESC LIMIT 1`,
      [startupId]
    );

    const investmentRelAfter = await pool.query(
      `SELECT investment_id, investor_id, startup_id, status
       FROM investment_relationships
       WHERE status IN ('active','accepted','countered','completed') AND investor_id = $1
       ORDER BY investment_id DESC LIMIT 1`,
      [investorId]
    );

    console.log("has_active_mentorship_after_setup=", mentorshipRelAfter.rowCount > 0);
    console.log("has_active_investment_after_setup=", investmentRelAfter.rowCount > 0);

    let lastTxRef = null;
    const runSalt = Date.now() % 1000;

    if (mentorshipRelAfter.rowCount > 0) {
      const mentorshipId = mentorshipRelAfter.rows[0].mentorship_id;
      const initRes = await request(app)
        .post("/api/transactions/payments/initiate")
        .set("Authorization", `Bearer ${startupToken}`)
        .send({
          relationship_id: mentorshipId,
          payment_type: "consultation",
          amount: 1200 + runSalt,
          currency: "ETB",
          description: "Phase5 real user flow mentorship consultation test",
        });

      console.log("init_mentorship_status=", initRes.statusCode);
      console.log("init_mentorship_has_checkout=", Boolean(initRes.body?.checkout_url));
      console.log("init_mentorship_tx_ref=", initRes.body?.tx_ref || null);
      if (initRes.body?.error) console.log("init_mentorship_error=", initRes.body.error);
      lastTxRef = initRes.body?.tx_ref || null;

      const histRes = await request(app)
        .get("/api/transactions/history?limit=5")
        .set("Authorization", `Bearer ${startupToken}`);
      console.log(
        "history_status=",
        histRes.statusCode,
        "history_count=",
        Array.isArray(histRes.body?.transactions) ? histRes.body.transactions.length : -1
      );

      if (!lastTxRef && Array.isArray(histRes.body?.transactions)) {
        const pending = histRes.body.transactions.find(
          (tx) => tx.status === "pending" && (tx.chapa_tx_ref || tx.transaction_reference)
        );
        if (pending) {
          lastTxRef = pending.chapa_tx_ref || pending.transaction_reference;
          console.log("reusing_existing_pending_tx_ref=", lastTxRef);
        }
      }
    }

    if (investmentRelAfter.rowCount > 0) {
      const investmentId = investmentRelAfter.rows[0].investment_id;
      const initInvRes = await request(app)
        .post("/api/transactions/payments/initiate")
        .set("Authorization", `Bearer ${investorToken}`)
        .send({
          relationship_id: investmentId,
          payment_type: "investment_funding",
          amount: 5000 + runSalt,
          currency: "ETB",
          description: "Phase5 real user flow investment funding test",
        });

      console.log("init_investment_status=", initInvRes.statusCode);
      console.log("init_investment_has_checkout=", Boolean(initInvRes.body?.checkout_url));
      console.log("init_investment_tx_ref=", initInvRes.body?.tx_ref || null);
      if (initInvRes.body?.error) console.log("init_investment_error=", initInvRes.body.error);
      if (!lastTxRef && initInvRes.body?.tx_ref) lastTxRef = initInvRes.body.tx_ref;
    }

    if (lastTxRef) {
      const verifyRes = await request(app)
        .get(`/api/transactions/payments/${encodeURIComponent(lastTxRef)}/verify`)
        .set("Authorization", `Bearer ${startupToken}`);

      console.log("verify_status=", verifyRes.statusCode);
      console.log("verify_payment_status=", verifyRes.body?.payment?.status || null);
      if (verifyRes.body?.error) console.log("verify_error=", verifyRes.body.error);
    }

    const webhookRes = await request(app)
      .post("/api/transactions/webhooks/chapa")
      .send({ tx_ref: "phase5_nonexistent_tx_ref_test" });
    const mentorEarningsRes = await request(app)
      .get("/api/transactions/mentor/earnings")
      .set("Authorization", `Bearer ${mentorToken}`);
    console.log("mentor_earnings_status=", mentorEarningsRes.statusCode);

    const investorAnalyticsRes = await request(app)
      .get("/api/transactions/investor/analytics")
      .set("Authorization", `Bearer ${investorToken}`);
    console.log("investor_analytics_status=", investorAnalyticsRes.statusCode);

    console.log("webhook_nonexistent_status=", webhookRes.statusCode);
    if (webhookRes.body?.error) console.log("webhook_nonexistent_error=", webhookRes.body.error);

    process.exit(0);
  } catch (err) {
    console.error("FLOW_ERROR", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
