const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const adminSecurityController = require("../controllers/adminSecurityController");

router.get(
  "/logs",
  authenticate,
  authorizeRoles("Admin"),
  adminSecurityController.listSecurityLogs
);
router.get(
  "/suspicious",
  authenticate,
  authorizeRoles("Admin"),
  adminSecurityController.listSuspiciousUsers
);
router.get(
  "/sessions",
  authenticate,
  authorizeRoles("Admin"),
  adminSecurityController.listActiveSessions
);
router.delete(
  "/sessions/:id",
  authenticate,
  authorizeRoles("Admin"),
  adminSecurityController.revokeSessionAdmin
);

router.get(
  "/analytics",
  authenticate,
  authorizeRoles("Admin"),
  adminSecurityController.getSecurityAnalytics
);

module.exports = router;
