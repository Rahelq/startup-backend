const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.get("/", authenticate, notificationController.listNotifications);
router.put("/:id/read", authenticate, notificationController.markAsRead);
router.get("/unread-count", authenticate, notificationController.unreadCount);
router.put("/mark-all-read", authenticate, notificationController.markAllRead);

module.exports = router;
