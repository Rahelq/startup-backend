const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const validateQuery = require("../middleware/validateQuery");
const settingsController = require("../controllers/settingsController");

router.get("/", authenticate, settingsController.getSettings);
router.put("/", authenticate, settingsController.updateSettings);

router.get("/privacy", authenticate, settingsController.getPrivacy);
router.put("/privacy", authenticate, settingsController.updatePrivacy);

router.get(
  "/notifications/preferences",
  authenticate,
  settingsController.getNotificationPreferences
);
router.put(
  "/notifications/preferences",
  authenticate,
  settingsController.updateNotificationPreferences
);

module.exports = router;
