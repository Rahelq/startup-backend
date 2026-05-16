const router = require("express").Router();
const validate = require("../middleware/validate");
const {
  createInvestmentOfferSchema,
  submitCounterOfferSchema,
  respondInvestmentOfferSchema,
  recordInvestmentPaymentSchema,
  submitStartupFeedbackSchema,
} = require("../validations/investmentWorkflow");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const investmentWorkflowController = require("../controllers/investmentWorkflowController");

// ============================================
// INVESTMENT WORKFLOW API ROUTES
// ============================================

// POST /api/investment-workflow/offers
// Create investment offer or request
router.post(
  "/offers",
  authenticate,
  authorizeRoles("Investor", "Startup"),
  validate(createInvestmentOfferSchema),
  investmentWorkflowController.createInvestmentOffer
);

// GET /api/investment-workflow/offers/:investmentId
// Get investment offer details
router.get("/offers/:investmentId", authenticate, investmentWorkflowController.getInvestmentOffer);

// POST /api/investment-workflow/investments/:investmentId/counter-offer
// Submit counter offer / negotiate terms
router.post(
  "/investments/:investmentId/counter-offer",
  authenticate,
  authorizeRoles("Investor", "Startup"),
  validate(submitCounterOfferSchema),
  investmentWorkflowController.submitCounterOffer
);

// PUT /api/investment-workflow/investments/:investmentId/respond
// Accept or reject investment offer
router.put(
  "/investments/:investmentId/respond",
  authenticate,
  authorizeRoles("Investor", "Startup"),
  validate(respondInvestmentOfferSchema),
  investmentWorkflowController.respondToInvestmentOffer
);

// GET /api/investment-workflow/investments/:investmentId/negotiation
// Get negotiation history and tracking
router.get(
  "/investments/:investmentId/negotiation",
  authenticate,
  investmentWorkflowController.getInvestmentNegotiationHistory
);

// GET /api/investment-workflow/portfolio
// Get investor's investment portfolio
router.get(
  "/portfolio",
  authenticate,
  authorizeRoles("Investor"),
  investmentWorkflowController.getMyInvestmentPortfolio
);

// GET /api/investment-workflow/received
// Get startup's received investments
router.get(
  "/received",
  authenticate,
  authorizeRoles("Startup"),
  investmentWorkflowController.getReceivedInvestments
);

// POST /api/investment-workflow/investments/:investmentId/payment
// Record investment payment / escrow tracking
router.post(
  "/investments/:investmentId/payment",
  authenticate,
  authorizeRoles("Investor"),
  validate(recordInvestmentPaymentSchema),
  investmentWorkflowController.recordInvestmentPayment
);

// POST /api/investment-workflow/investments/:investmentId/tracking
router.post(
  "/investments/:investmentId/tracking",
  authenticate,
  authorizeRoles("Investor", "Startup"),
  investmentWorkflowController.recordInvestmentEvent
);

// GET /api/investment-workflow/investments/:investmentId/tracking
router.get(
  "/investments/:investmentId/tracking",
  authenticate,
  authorizeRoles("Investor", "Startup"),
  investmentWorkflowController.listInvestmentEvents
);

// POST /api/investment-workflow/investments/:investmentId/documents
router.post(
  "/investments/:investmentId/documents",
  authenticate,
  authorizeRoles("Investor", "Startup"),
  investmentWorkflowController.attachInvestmentDocument
);

// POST /api/investment-workflow/investments/:investmentId/feedback
// Investor submits startup feedback
router.post(
  "/investments/:investmentId/feedback",
  authenticate,
  authorizeRoles("Investor"),
  validate(submitStartupFeedbackSchema),
  investmentWorkflowController.submitStartupFeedback
);

// GET /api/investment-workflow/feedback
// Startup views investor feedback
router.get(
  "/feedback",
  authenticate,
  authorizeRoles("Startup"),
  investmentWorkflowController.listStartupFeedback
);

// GET /api/investment-workflow/admin/all
// Admin view all investments
router.get(
  "/admin/all",
  authenticate,
  authorizeRoles("Admin"),
  investmentWorkflowController.getAllInvestments
);

module.exports = router;
