const investmentWorkflowService = require("../services/investmentWorkflowService");

function run(res, operation) {
  return operation()
    .then((result) => res.status(result.status || 200).json(result.data))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
}

exports.createInvestmentOffer = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.createInvestmentOffer({
      userId: req.user.user_id,
      role: req.user.role,
      body: req.body,
    })
  );

exports.getInvestmentOffer = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.getInvestmentOffer({
      userId: req.user.user_id,
      investmentId: req.params.investmentId,
    })
  );

exports.submitCounterOffer = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.submitCounterOffer({
      userId: req.user.user_id,
      investmentId: req.params.investmentId,
      body: req.body,
    })
  );

exports.respondToInvestmentOffer = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.respondToInvestmentOffer({
      userId: req.user.user_id,
      investmentId: req.params.investmentId,
      body: req.body,
    })
  );

exports.getInvestmentNegotiationHistory = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.getInvestmentNegotiationHistory({
      userId: req.user.user_id,
      investmentId: req.params.investmentId,
    })
  );

exports.getMyInvestmentPortfolio = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.getMyInvestmentPortfolio({
      userId: req.user.user_id,
    })
  );

exports.recordInvestmentPayment = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.recordInvestmentPayment({
      userId: req.user.user_id,
      investmentId: req.params.investmentId,
      body: req.body,
    })
  );

exports.getReceivedInvestments = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.getReceivedInvestments({
      userId: req.user.user_id,
    })
  );

exports.getAllInvestments = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.getAllInvestments({
      query: req.query,
    })
  );

exports.submitStartupFeedback = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.submitStartupFeedback({
      userId: req.user.user_id,
      role: req.user.role,
      investmentId: req.params.investmentId,
      body: req.body,
    })
  );

exports.listStartupFeedback = async (req, res) =>
  run(res, () =>
    investmentWorkflowService.listStartupFeedback({
      userId: req.user.user_id,
      role: req.user.role,
    })
  );

// Phase 3: investment tracking endpoints
const investmentTrackingService = require("../services/investmentTrackingService");

exports.recordInvestmentEvent = async (req, res) =>
  run(res, () =>
    (async () => {
      const userId = req.user.user_id;
      const investmentId = Number(req.params.investmentId || req.body.investment_id);
      const { event_type: eventType, details } = req.body || {};
      const rec = await investmentTrackingService.recordEvent({
        userId,
        investmentId,
        eventType,
        details,
      });
      return { status: 201, data: { message: "Event recorded", event: rec } };
    })()
  );

exports.listInvestmentEvents = async (req, res) =>
  run(res, () =>
    (async () => {
      const userId = req.user.user_id;
      const investmentId = Number(req.params.investmentId || req.query.investment_id);
      const rows = await investmentTrackingService.listEvents({ userId, investmentId });
      return { status: 200, data: { events: rows } };
    })()
  );

exports.attachInvestmentDocument = async (req, res) =>
  run(res, () =>
    (async () => {
      const pool = require("../config/db");
      const investmentId = Number(req.params.investmentId || req.body.investment_id);
      const { document_id } = req.body || {};
      if (!investmentId || !document_id) {
        const err = new Error("investment_id and document_id are required");
        err.status = 400;
        throw err;
      }
      const r = await pool.query(
        "INSERT INTO investment_documents (investment_id, document_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *",
        [investmentId, Number(document_id)]
      );
      return { status: 201, data: { message: "Document attached", record: r.rows[0] || null } };
    })()
  );
