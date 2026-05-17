const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/ratingController");
const authMiddleware = require("../middleware/authMiddleware");
const ratingMiddleware = require("../middleware/ratingPermissionMiddleware");

router.get(
  "/:entityType/:entityId",
  authMiddleware.requireAuth,
  ratingController.listEntityRatings
);
router.post(
  "/",
  authMiddleware.requireAuth,
  ratingMiddleware.validateRatingPayload,
  ratingMiddleware.requireRelationshipParticipant,
  ratingMiddleware.requireCompletedSession,
  ratingMiddleware.preventDuplicateRatings,
  ratingMiddleware.validateRatingPermission,
  ratingController.createRating
);
router.post(
  "/:id/report",
  authMiddleware.requireAuth,
  ratingMiddleware.validateReportPayload,
  ratingController.reportRating
);

module.exports = router;
