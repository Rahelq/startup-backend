const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const blockController = require("../controllers/blockController");

router.post("/:userId", authenticate, blockController.block);
router.delete("/:userId", authenticate, blockController.unblock);
router.get("/", authenticate, blockController.listBlocked);

module.exports = router;
