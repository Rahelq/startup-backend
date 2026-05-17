const express = require("express");
const router = express.Router();
const reputationController = require("../controllers/reputationController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/:userId", authMiddleware.requireAuth, reputationController.getUserReputation);

module.exports = router;
