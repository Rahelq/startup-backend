const router = require("express").Router();
const upload = require("../middleware/multerMemory");
const validate = require("../middleware/validate");
const {
  createMentorshipRequestSchema,
  respondToMentorshipRequestSchema,
} = require("../validations/mentorshipRequest");
const {
  createMentorshipSessionSchema,
  updateMentorshipSessionSchema,
  updateAvailabilitySchema,
} = require("../validations/mentorshipSession");

const { authenticate, authorizeRoles, requireApproval } = require("../middleware/authMiddleware");
const requireActiveRelationship = require("../middleware/requireActiveRelationship");
const mentorshipController = require("../controllers/mentorshipController");
const mentorshipAdvancedController = require("../controllers/mentorshipAdvancedController");
const mentorshipSchedulingController = require("../controllers/mentorshipSchedulingController");

// Startup flows
router.post(
  "/requests",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  validate(createMentorshipRequestSchema),
  mentorshipController.createMentorshipRequest
);

router.get(
  "/requests/outgoing",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  mentorshipController.getStartupMentorshipRequests
);

// Mentor flows
router.get(
  "/availability/me",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  mentorshipSchedulingController.getMyAvailability
);

router.put(
  "/availability/me",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  validate(updateAvailabilitySchema),
  mentorshipSchedulingController.updateMyAvailability
);

router.get(
  "/availability/:mentorId",
  authenticate,
  requireApproval,
  mentorshipSchedulingController.getMentorAvailability
);

router.get(
  "/requests/incoming",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  mentorshipController.getMentorIncomingRequests
);

router.put(
  "/requests/:requestId/respond",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  validate(respondToMentorshipRequestSchema),
  mentorshipController.respondToMentorshipRequest
);

router.post(
  "/sessions",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  validate(createMentorshipSessionSchema),
  mentorshipController.scheduleMentorshipSession
);

router.post(
  "/bookings",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  requireActiveRelationship("mentorship"),
  mentorshipSchedulingController.bookSession
);

router.get("/sessions", authenticate, requireApproval, mentorshipSchedulingController.listSessions);

router.get(
  "/sessions/:sessionId",
  authenticate,
  requireApproval,
  mentorshipAdvancedController.getMentorshipSessionById
);

router.post(
  "/reports",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  requireActiveRelationship("mentorship"),
  mentorshipAdvancedController.createMentorshipReport
);

router.get(
  "/reports",
  authenticate,
  requireApproval,
  mentorshipAdvancedController.getMentorshipReports
);

router.post(
  "/resources",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  requireActiveRelationship("mentorship"),
  upload.single("file"),
  mentorshipAdvancedController.shareMentorshipResource
);

router.get(
  "/resources",
  authenticate,
  requireApproval,
  mentorshipAdvancedController.getMentorshipResources
);

router.post(
  "/payments",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  mentorshipAdvancedController.createMentorshipPayment
);

router.get(
  "/payments",
  authenticate,
  requireApproval,
  mentorshipAdvancedController.getMentorshipPayments
);

router.post(
  "/chat/messages",
  authenticate,
  requireApproval,
  requireActiveRelationship("mentorship"),
  mentorshipAdvancedController.sendMentorshipMessage
);

router.post(
  "/progress",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor", "Startup"),
  requireActiveRelationship("mentorship"),
  mentorshipAdvancedController.recordProgress
);

router.get(
  "/progress",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor", "Startup"),
  mentorshipAdvancedController.getProgress
);

router.get(
  "/chat/conversation/:otherUserId",
  authenticate,
  requireApproval,
  mentorshipAdvancedController.getMentorshipConversation
);

router.put(
  "/sessions/:sessionId",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  validate(updateMentorshipSessionSchema),
  mentorshipController.updateMentorshipSessionStatus
);

router.post(
  "/sessions/:sessionId/confirm",
  authenticate,
  requireApproval,
  authorizeRoles("Mentor"),
  mentorshipSchedulingController.confirmSession
);

router.put(
  "/sessions/:sessionId/reschedule",
  authenticate,
  requireApproval,
  mentorshipSchedulingController.rescheduleSession
);

router.post(
  "/sessions/:sessionId/cancel",
  authenticate,
  requireApproval,
  mentorshipSchedulingController.cancelSession
);

// Shared history (role-checked in controller)
router.get("/history", authenticate, requireApproval, mentorshipController.getMentorshipHistory);

module.exports = router;
