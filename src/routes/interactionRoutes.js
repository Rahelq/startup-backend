const router = require("express").Router();
const validate = require("../middleware/validate");
const {
  createInteractionRequestSchema,
  respondInteractionRequestSchema,
} = require("../validations/interactionWorkflow");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const interactionController = require("../controllers/interactionController");

// ============================================
// 🔹 USER ROUTES (Authenticated)
// ============================================

// POST /api/interactions - Create interaction
router.post(
  "/",
  authenticate,
  validate(createInteractionRequestSchema),
  interactionController.createInteraction
);

// PUT /api/interactions/:interactionId/respond - Accept/Reject
router.put(
  "/:interactionId/respond",
  authenticate,
  validate(respondInteractionRequestSchema),
  interactionController.respondToInteraction
);

// DELETE /api/interactions/:interactionId - Cancel (sender only)
router.delete("/:interactionId", authenticate, interactionController.cancelInteraction);

// GET /api/interactions - Get my interactions (sent/received)
router.get("/", authenticate, interactionController.getMyInteractions);

// ============================================
// 🔹 RELATIONSHIPS (Active connections)
// ============================================

// GET /api/interactions/relationships/mentorships - Get active mentorships
router.get("/relationships/mentorships", authenticate, interactionController.getActiveMentorships);

// GET /api/interactions/relationships/investments - Get active investments
router.get("/relationships/investments", authenticate, interactionController.getActiveInvestments);

// ============================================
// 🔹 ADMIN ROUTES
// ============================================

// GET /api/interactions/admin/all - View all interactions
router.get(
  "/admin/all",
  authenticate,
  authorizeRoles("Admin"),
  interactionController.adminGetInteractions
);

// GET /api/interactions/:interactionId - Get single interaction
router.get("/:interactionId", authenticate, interactionController.getInteraction);

module.exports = router;
