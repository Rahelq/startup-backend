const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const detectSuspiciousLogin = require("../middleware/detectSuspiciousLogin");
const { requireOwnership } = require("../middleware/roles");
const userController = require("../controllers/userController");

// Profile endpoints: user can access own profile; admin can access any
router.get("/profile", authenticate, detectSuspiciousLogin(), userController.getMyProfile);
router.put(
  "/profile",
  authenticate,
  detectSuspiciousLogin(),
  requireOwnership(async (req) => req.user.user_id),
  userController.updateMyProfile
);

router.post("/verification/submit", authenticate, userController.submitProfileForReview);

module.exports = router;
