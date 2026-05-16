const router = require("express").Router();
const validate = require("../../middleware/validate");
const { clearOldAuditLogsSchema } = require("../../validations/admin");

const { authenticate, authorizeRoles } = require("../../middleware/authMiddleware");
const adminService = require("../../services/adminService");

function run(res, operation) {
  return operation()
    .then((result) => res.status(result.status || 200).json(result.data))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
}

router.get("/maintenance/status", authenticate, authorizeRoles("Admin"), (req, res) =>
  run(res, () => adminService.maintenanceStatus())
);

router.post(
  "/maintenance/clear-audit-logs",
  authenticate,
  authorizeRoles("Admin"),
  validate(clearOldAuditLogsSchema),
  (req, res) =>
    run(res, () => adminService.clearOldAuditLogs({ body: req.body, userId: req.user.user_id }))
);

module.exports = router;
