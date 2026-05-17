const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const recommendationController = require("../controllers/recommendationController");

router.get("/mentors", requireAuth, recommendationController.recommendMentors);
router.get("/mentors/:userId", requireAuth, recommendationController.recommendMentors);

module.exports = router;
