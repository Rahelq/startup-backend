const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const upload = require("../middleware/multerMemory");
const requireRelationshipAccess = require("../middleware/requireRelationshipAccess");
const resourceController = require("../controllers/resourceController");

// POST /api/resources
router.post(
  "/",
  authenticate,
  upload.single("file"),
  requireRelationshipAccess(),
  resourceController.uploadResource
);

// GET /api/resources?relationship_type=mentorship&relationship_id=123
router.get("/", authenticate, requireRelationshipAccess(true), resourceController.listResources);

// GET /api/resources/:resourceId
router.get("/:resourceId", authenticate, resourceController.getResource);

module.exports = router;
