const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/authMiddleware");
const intelligenceController = require("../controllers/intelligenceController");

router.post("/user/:userId/recalculate", requireAuth, intelligenceController.recalcUser);
router.post(
  "/platform/snapshot",
  requireAuth,
  authorizeRoles("Admin"),
  intelligenceController.snapshotPlatform
);

module.exports = router;
