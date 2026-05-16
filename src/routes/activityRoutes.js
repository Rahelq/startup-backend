const router = require("express").Router();
const { authenticate, requireApproval } = require("../middleware/authMiddleware");
const { requireRoleDashboard } = require("../middleware/dashboardAccess");
const validateQuery = require("../middleware/validateQuery");
const { activityFeedQuerySchema } = require("../validations/experience");
const controller = require("../controllers/activityFeedController");

router.get(
  "/feed",
  authenticate,
  requireApproval,
  validateQuery(activityFeedQuerySchema),
  controller.getFeed
);
router.get(
  "/summary",
  authenticate,
  requireApproval,
  requireRoleDashboard("Startup", "Mentor", "Investor", "Admin"),
  controller.getSummary
);

module.exports = router;
