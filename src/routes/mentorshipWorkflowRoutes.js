const router = require("express").Router();
const validate = require("../middleware/validate");
const {
  createMentorshipOfferSchema,
  setMentorPricingSchema,
  bookMentorshipSessionSchema,
  recordSessionNotesSchema,
  shareMentorshipResourceSchema,
} = require("../validations/mentorshipWorkflow");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const mentorshipWorkflowController = require("../controllers/mentorshipWorkflowController");

// ============================================
// MENTORSHIP WORKFLOW API ROUTES
// ============================================

// POST /api/mentorship-workflow/offers
// Create mentorship offer or request
router.post(
  "/offers",
  authenticate,
  authorizeRoles("Mentor", "Startup"),
  validate(createMentorshipOfferSchema),
  mentorshipWorkflowController.createMentorshipOffer
);

// GET /api/mentorship-workflow/offers/:mentorshipId
// Get mentorship offer details
router.get("/offers/:mentorshipId", authenticate, mentorshipWorkflowController.getMentorshipOffer);

// POST /api/mentorship-workflow/mentors/:mentorshipId/pricing
// Set mentor pricing and availability
router.post(
  "/mentors/:mentorshipId/pricing",
  authenticate,
  authorizeRoles("Mentor"),
  validate(setMentorPricingSchema),
  mentorshipWorkflowController.setMentorPricing
);

// POST /api/mentorship-workflow/sessions/book
// Startup books a mentorship session
router.post(
  "/sessions/book",
  authenticate,
  authorizeRoles("Startup"),
  validate(bookMentorshipSessionSchema),
  mentorshipWorkflowController.bookSession
);

// GET /api/mentorship-workflow/sessions
// Get mentorship sessions for a relationship
router.get("/sessions", authenticate, mentorshipWorkflowController.getMentorshipSessions);

// POST /api/mentorship-workflow/sessions/:sessionId/notes
// Record session notes and progress
router.post(
  "/sessions/:sessionId/notes",
  authenticate,
  validate(recordSessionNotesSchema),
  mentorshipWorkflowController.recordSessionNotes
);

// POST /api/mentorship-workflow/resources
// Share mentorship resources
router.post(
  "/resources",
  authenticate,
  authorizeRoles("Mentor"),
  validate(shareMentorshipResourceSchema),
  mentorshipWorkflowController.shareResource
);

// GET /api/mentorship-workflow/my-mentorships
// Get mentor's mentorships
router.get(
  "/my-mentorships",
  authenticate,
  authorizeRoles("Mentor"),
  mentorshipWorkflowController.getMyMentorships
);

// GET /api/mentorship-workflow/received
// Get startup's received mentorships
router.get(
  "/received",
  authenticate,
  authorizeRoles("Startup"),
  mentorshipWorkflowController.getReceivedMentorships
);

// GET /api/mentorship-workflow/admin/all
// Admin view all mentorships
router.get(
  "/admin/all",
  authenticate,
  authorizeRoles("Admin"),
  mentorshipWorkflowController.getAllMentorships
);

module.exports = router;
