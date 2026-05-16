const router = require("express").Router();
const upload = require("../middleware/multerMemory");
const validate = require("../middleware/validate");
const { sendMessageSchema } = require("../validations/message");
const { authenticate, requireApproval } = require("../middleware/authMiddleware");
const messageController = require("../controllers/messageController");

router.post(
  "/",
  authenticate,
  requireApproval,
  upload.single("file"),
  validate(sendMessageSchema),
  messageController.sendMessage
);
router.get("/unread", authenticate, requireApproval, messageController.getUnreadCount);
router.put(
  "/:messageId",
  authenticate,
  requireApproval,
  upload.single("file"),
  messageController.editMessage
);
router.delete("/:messageId", authenticate, requireApproval, messageController.deleteMessage);
router.get("/:conversationId", authenticate, requireApproval, messageController.getMessages);
router.put("/seen/:conversationId", authenticate, requireApproval, messageController.markSeen);

module.exports = router;
