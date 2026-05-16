const router = require("express").Router();
const validate = require("../middleware/validate");
const { createConversationSchema } = require("../validations/conversation");
const { authenticate, requireApproval } = require("../middleware/authMiddleware");
const conversationController = require("../controllers/conversationController");

router.post(
  "/",
  authenticate,
  requireApproval,
  validate(createConversationSchema),
  conversationController.createOrGetConversation
);
router.get("/:userId", authenticate, requireApproval, conversationController.listMyConversations);
router.get(
  "/:userId/with/:otherUserId",
  authenticate,
  requireApproval,
  conversationController.getConversationByParticipants
);

module.exports = router;

