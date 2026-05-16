const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoSessionController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/webhooks/zoom", videoController.zoomWebhook);

router.post("/", authenticate, videoController.create);
router.get("/", authenticate, videoController.listForUser);
router.get("/:id", authenticate, videoController.get);
router.post("/:id/join", authenticate, videoController.join);
router.put("/:id/reschedule", authenticate, videoController.reschedule);
router.post("/:id/cancel", authenticate, videoController.cancel);

module.exports = router;
