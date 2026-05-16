const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");

// Only logged-in users
router.get("/dashboard", authenticate, (req, res) => {
  res.send("Welcome user " + req.user.user_id);
});

// Only startups
router.get(
  "/startup-only",
  authenticate,
  authorizeRoles("Startup"),
  (req, res) => {
    res.send("Startup content only 🚀");
  }
);

module.exports = router;