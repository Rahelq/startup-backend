const router = require("express").Router();

const { authenticate, authorizeRoles, requireApproval } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  createInvestmentRequestSchema,
  respondToInvestmentRequestSchema,
} = require("../validations/investmentRequest");
const { createPaymentSchema } = require("../validations/payment");

const investmentController = require("../controllers/investmentController");

router.post(
  "/request",
  authenticate,
  requireApproval,
  authorizeRoles("Investor"),
  validate(createInvestmentRequestSchema),
  investmentController.createInvestmentRequest
);

router.get("/requests", authenticate, requireApproval, investmentController.listInvestmentRequests);

router.put(
  "/requests/:requestId/respond",
  authenticate,
  requireApproval,
  validate(respondToInvestmentRequestSchema),
  investmentController.respondToInvestmentRequest
);

router.post(
  "/requests/:requestId/payments",
  authenticate,
  requireApproval,
  authorizeRoles("Investor"),
  validate(createPaymentSchema),
  investmentController.recordInvestmentPayment
);

router.get("/payments", authenticate, requireApproval, investmentController.listInvestmentPayments);

router.post(
  "/requests/:requestId/feedback",
  authenticate,
  requireApproval,
  authorizeRoles("Investor"),
  investmentController.submitInvestorFeedback
);

router.get(
  "/feedback",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  investmentController.listInvestorFeedback
);

module.exports = router;
