const router = require("express").Router();

const {
	authenticate,
	authorizeRoles,
} = require("../../middleware/authMiddleware");
const adminController = require("../../controllers/adminController");

router.get(
	"/documents/:documentId",
	authenticate,
	authorizeRoles("Admin"),
	adminController.getDocument,
);

router.get(
	"/mentor-documents/:documentId",
	authenticate,
	authorizeRoles("Admin"),
	adminController.getMentorDocument,
);

router.delete(
	"/mentor-documents/:documentId",
	authenticate,
	authorizeRoles("Admin"),
	adminController.deleteMentorDocumentAdmin,
);

router.delete(
	"/documents/:documentId",
	authenticate,
	authorizeRoles("Admin"),
	adminController.deleteDocumentAdmin,
);

// List documents with optional filters: type, startup_id, mentor_id
router.get(
	"/documents",
	authenticate,
	authorizeRoles("Admin"),
	adminController.listDocuments,
);

// Delete a message (content moderation)
router.delete(
	"/messages/:id",
	authenticate,
	authorizeRoles("Admin"),
	adminController.deleteMessage,
);

router.delete(
	"/projects/:projectId",
	authenticate,
	authorizeRoles("Admin"),
	adminController.removeProject,
);

router.put(
	"/projects/:projectId/restore",
	authenticate,
	authorizeRoles("Admin"),
	adminController.restoreProject,
);

router.delete(
	"/mentorship/resources/:id",
	authenticate,
	authorizeRoles("Admin"),
	adminController.deleteMentorshipResource,
);

module.exports = router;
