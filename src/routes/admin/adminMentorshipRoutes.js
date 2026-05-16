const router = require("express").Router();

const {
	authenticate,
	authorizeRoles,
} = require("../../middleware/authMiddleware");
const mentorshipAdvancedController = require("../../controllers/mentorshipAdvancedController");

router.get(
	"/mentorship/overview",
	authenticate,
	authorizeRoles("Admin"),
	mentorshipAdvancedController.adminMentorshipOverview,
);

router.get(
	"/mentorship/requests",
	authenticate,
	authorizeRoles("Admin"),
	mentorshipAdvancedController.adminListMentorshipRequests,
);

router.get(
	"/mentorship/sessions",
	authenticate,
	authorizeRoles("Admin"),
	mentorshipAdvancedController.adminListMentorshipSessions,
);

router.get(
	"/mentorship/reports",
	authenticate,
	authorizeRoles("Admin"),
	mentorshipAdvancedController.adminListMentorshipReports,
);

router.get(
	"/mentorship/resources",
	authenticate,
	authorizeRoles("Admin"),
	mentorshipAdvancedController.adminListMentorshipResources,
);

router.get(
	"/mentorship/payments",
	authenticate,
	authorizeRoles("Admin"),
	mentorshipAdvancedController.adminListMentorshipPayments,
);

module.exports = router;
