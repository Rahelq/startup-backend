const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

router.get("/mentor", requireAuth, analyticsController.getMentor);
router.get("/mentor/:userId", requireAuth, analyticsController.getMentor);
router.get("/startup", requireAuth, analyticsController.getStartup);
router.get("/startup/:userId", requireAuth, analyticsController.getStartup);
router.get("/platform", requireAuth, analyticsController.getPlatform);

module.exports = router;
