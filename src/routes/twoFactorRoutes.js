const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const twoFactorController = require("../controllers/twoFactorController");

router.post("/setup", authenticate, twoFactorController.setup);
router.post("/verify", authenticate, twoFactorController.verify);
router.post("/disable", authenticate, twoFactorController.disable);
router.get("/setup/qr", authenticate, twoFactorController.getQRCode);
router.post("/redeem-backup", authenticate, twoFactorController.redeemBackup);

module.exports = router;
