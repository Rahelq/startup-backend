const router = require("express").Router();
const validate = require("../middleware/validate");
const { authenticate, requireApproval } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const transactionController = require("../controllers/transactionController");
const {
  initializeTransactionPaymentSchema,
  verifyTransactionSchema,
  refundRequestSchema,
  adminRefundDecisionSchema,
} = require("../validations/transaction");

// Payment lifecycle
router.post(
  "/payments/initiate",
  authenticate,
  requireApproval,
  validate(initializeTransactionPaymentSchema),
  transactionController.initializePayment
);
router.post(
  "/payments/verify",
  authenticate,
  requireApproval,
  validate(verifyTransactionSchema),
  transactionController.verifyPayment
);
router.get(
  "/payments/:txRef/verify",
  authenticate,
  requireApproval,
  transactionController.verifyPayment
);
router.post("/webhooks/chapa", transactionController.handleChapaWebhook);

// Transaction history and details
router.get("/history", authenticate, requireApproval, transactionController.listMyTransactions);
router.get(
  "/payments/:paymentId",
  authenticate,
  requireApproval,
  transactionController.getTransactionById
);

// Refunds
router.post(
  "/payments/:paymentId/refund",
  authenticate,
  requireApproval,
  validate(refundRequestSchema),
  transactionController.requestRefund
);
router.post(
  "/refunds/:refundId/decision",
  authenticate,
  requireApproval,
  authorizeRoles("admin"),
  validate(adminRefundDecisionSchema),
  transactionController.decideRefund
);

// Earnings and analytics
router.get(
  "/mentor/earnings",
  authenticate,
  requireApproval,
  authorizeRoles("mentor"),
  transactionController.getMentorEarnings
);
router.get(
  "/investor/analytics",
  authenticate,
  requireApproval,
  authorizeRoles("investor"),
  transactionController.getInvestorFundingAnalytics
);
router.get(
  "/platform/revenue",
  authenticate,
  requireApproval,
  authorizeRoles("admin"),
  transactionController.getPlatformRevenue
);

module.exports = router;
