const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const deviceController = require("../controllers/deviceController");

router.get("/", authenticate, deviceController.listDevices);
router.delete("/:id", authenticate, deviceController.removeDevice);
router.post("/:id/trust", authenticate, deviceController.trustDevice);

module.exports = router;
