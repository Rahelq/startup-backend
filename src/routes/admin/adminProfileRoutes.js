const router = require("express").Router();

const {
	authenticate,
	authorizeRoles,
} = require("../../middleware/authMiddleware");
const adminController = require("../../controllers/adminController");

router.get(
	"/startups",
	authenticate,
	authorizeRoles("Admin"),
	adminController.listStartups,
);

router.put(
	"/startups/:startupId/remove",
	authenticate,
	authorizeRoles("Admin"),
	adminController.removeStartupListing,
);

router.put(
	"/startups/:startupId/approve",
	authenticate,
	authorizeRoles("Admin"),
	adminController.approveStartup,
);

router.put(
	"/startups/:startupId/unapprove",
	authenticate,
	authorizeRoles("Admin"),
	adminController.unapproveStartup,
);

router.put(
	"/mentors/:mentorId/approve",
	authenticate,
	authorizeRoles("Admin"),
	adminController.approveMentor,
);

router.put(
	"/mentors/:mentorId/unapprove",
	authenticate,
	authorizeRoles("Admin"),
	adminController.unapproveMentor,
);

router.put(
	"/investors/:investorId/approve",
	authenticate,
	authorizeRoles("Admin"),
	adminController.approveInvestor,
);

router.put(
	"/investors/:investorId/unapprove",
	authenticate,
	authorizeRoles("Admin"),
	adminController.unapproveInvestor,
);

module.exports = router;
