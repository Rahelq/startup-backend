const router = require("express").Router();

const upload = require("../middleware/multerMemory");

const validate = require("../middleware/validate");
const { startupCreateSchema, startupUpdateSchema } = require("../validations/startup");

const { authenticate, authorizeRoles, requireApproval } = require("../middleware/authMiddleware");

const startupController = require("../controllers/startupController");

// Accept startup form fields plus optional document uploads from Postman
router.post(
  "/profile",
  authenticate,
  authorizeRoles("Startup"),
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "pitch_deck", maxCount: 1 },
    { name: "business_plan", maxCount: 1 },
    { name: "founder_id", maxCount: 1 },
    { name: "government_id", maxCount: 2 },
    { name: "passport", maxCount: 1 },
    { name: "kebele_id", maxCount: 1 },
    { name: "business_registration", maxCount: 1 },
    { name: "trade_license", maxCount: 1 },
    { name: "support_letter", maxCount: 1 },
    { name: "tin_certificate", maxCount: 1 },
    { name: "logo", maxCount: 1 },
    { name: "profile_image", maxCount: 1 },
    { name: "proof_of_address", maxCount: 1 },
  ]),
  validate(startupCreateSchema),
  startupController.createStartupProfile
);

router.get(
  "/profile",
  authenticate,
  authorizeRoles("Startup"),
  startupController.getMyStartupProfile
);

// Update existing profile
router.put(
  "/profile",
  authenticate,
  authorizeRoles("Startup"),
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "pitch_deck", maxCount: 1 },
    { name: "business_plan", maxCount: 1 },
    { name: "founder_id", maxCount: 1 },
    { name: "government_id", maxCount: 2 },
    { name: "passport", maxCount: 1 },
    { name: "kebele_id", maxCount: 1 },
    { name: "business_registration", maxCount: 1 },
    { name: "trade_license", maxCount: 1 },
    { name: "support_letter", maxCount: 1 },
    { name: "tin_certificate", maxCount: 1 },
    { name: "logo", maxCount: 1 },
    { name: "profile_image", maxCount: 1 },
    { name: "proof_of_address", maxCount: 1 },
  ]),
  validate(startupUpdateSchema),
  startupController.updateStartupProfile
);

router.get(
  "/discover",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  startupController.searchInvestorsAndMentors
);

router.get(
  "/recommendations",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  startupController.getRecommendations
);

router.get(
  "/dashboard",
  authenticate,
  requireApproval,
  authorizeRoles("Startup"),
  startupController.getDashboardStatus
);

module.exports = router;
