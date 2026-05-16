const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  requireDashboardAccess,
  requireRoleDashboard,
  requireAnalyticsPermission,
} = require("../middleware/dashboardAccess");
const validateQuery = require("../middleware/validateQuery");
const { dashboardQuerySchema } = require("../validations/experience");
const controller = require("../controllers/dashboardController");

router.get(
  "/startup",
  authenticate,
  requireDashboardAccess("Startup"),
  validateQuery(dashboardQuerySchema),
  controller.getStartupDashboard
);
router.get(
  "/mentor",
  authenticate,
  requireDashboardAccess("Mentor"),
  validateQuery(dashboardQuerySchema),
  controller.getMentorDashboard
);
router.get(
  "/investor",
  authenticate,
  requireDashboardAccess("Investor"),
  validateQuery(dashboardQuerySchema),
  controller.getInvestorDashboard
);
router.get(
  "/admin",
  authenticate,
  requireAnalyticsPermission,
  validateQuery(dashboardQuerySchema),
  controller.getAdminDashboard
);

module.exports = router;
