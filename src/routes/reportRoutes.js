const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

// POST /api/reports - Create a report/flag (authenticated users)
router.post("/", authenticate, adminController.createReport);

// GET /api/reports/my - Get user's own reports
router.get("/my", authenticate, adminController.getUserReports);

module.exports = router;
