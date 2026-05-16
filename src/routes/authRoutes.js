const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middleware/validate");
const redisRateLimiter = require("../middleware/redisRateLimiter");
const detectSuspiciousLogin = require("../middleware/detectSuspiciousLogin");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validations/auth");

// Register user
router.post("/register", validate(registerSchema), authController.register);

// Login user
router.post(
  "/login",
  redisRateLimiter({ windowSec: 15 * 60, maxAttempts: 6 }),
  validate(loginSchema),
  authController.login
);

// Refresh access token
router.post("/refresh", authController.refresh);

// Logout (revoke refresh token)
router.post("/logout", detectSuspiciousLogin(), authController.logout);

// Password reset (use PUT /api/admin/users/approve/:userId for approvals)
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
