const router = require("express").Router();

const {
	authenticate,
	authorizeRoles,
} = require("../../middleware/authMiddleware");
const adminController = require("../../controllers/adminController");

router.get(
	"/audit-logs",
	authenticate,
	authorizeRoles("Admin"),
	adminController.listAuditLogs,
);

router.get(
	"/audit-logs/export",
	authenticate,
	authorizeRoles("Admin"),
	adminController.exportAuditLogs,
);

router.get(
	"/reports/overview",
	authenticate,
	authorizeRoles("Admin"),
	adminController.reportsOverview,
);

router.get(
	"/reports/export",
	authenticate,
	authorizeRoles("Admin"),
	adminController.exportReportCSV,
);

router.post(
	"/reports/schedule",
	authenticate,
	authorizeRoles("Admin"),
	adminController.scheduleReport,
);

// Admin: list user-submitted reports (flags)
router.get(
	"/reports",
	authenticate,
	authorizeRoles("Admin"),
	adminController.listReports,
);

// Admin: update report status (reviewed/actioned)
router.put(
	"/reports/:reportId",
	authenticate,
	authorizeRoles("Admin"),
	adminController.updateReportStatus,
);

module.exports = router;
