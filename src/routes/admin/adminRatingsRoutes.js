const router = require("express").Router();
const { authenticate, authorizeRoles } = require("../../middleware/authMiddleware");
const adminRatingsController = require("../../controllers/adminRatingsController");

router.get("/", authenticate, authorizeRoles("Admin"), adminRatingsController.listRatings);
router.get("/reports", authenticate, authorizeRoles("Admin"), adminRatingsController.listReports);
router.put(
  "/:ratingId/hide",
  authenticate,
  authorizeRoles("Admin"),
  adminRatingsController.hideRating
);
router.put(
  "/:ratingId/remove",
  authenticate,
  authorizeRoles("Admin"),
  adminRatingsController.removeRating
);
router.put(
  "/:ratingId/restore",
  authenticate,
  authorizeRoles("Admin"),
  adminRatingsController.restoreRating
);
router.put(
  "/reports/:reportId",
  authenticate,
  authorizeRoles("Admin"),
  adminRatingsController.reviewReport
);
router.put(
  "/reviewers/:userId/ban",
  authenticate,
  authorizeRoles("Admin"),
  adminRatingsController.banReviewer
);

module.exports = router;
