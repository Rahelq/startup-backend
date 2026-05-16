const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const detectSuspiciousLogin = require("../middleware/detectSuspiciousLogin");
const sessionController = require("../controllers/sessionController");

router.get("/", authenticate, detectSuspiciousLogin(), sessionController.listSessions);
router.delete("/:id", authenticate, detectSuspiciousLogin(), sessionController.revokeSession);
router.post("/logout-all", authenticate, detectSuspiciousLogin(), sessionController.revokeAll);

module.exports = router;
