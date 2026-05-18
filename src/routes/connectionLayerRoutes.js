const router = require("express").Router();
const validate = require("../middleware/validate");
const { authenticate, requireApproval } = require("../middleware/authMiddleware");
const controller = require("../controllers/connectionLayerController");
const upload = require("../middleware/multerMemory");
const {
  mentorshipProposalSchema,
  proposalStatusSchema,
  investmentOfferSchema,
  offerStatusSchema,
  fundingRequestSchema,
  fundingStatusSchema,
  negotiationSchema,
  mentorshipRelationshipStatusSchema,
  investmentRelationshipStatusSchema,
} = require("../validations/connectionLayer");

router.get("/discovery/mentors", authenticate, requireApproval, controller.discoveryMentors);
router.get("/discovery/startups", authenticate, requireApproval, controller.discoveryStartups);
router.get("/discovery/investors", authenticate, requireApproval, controller.discoveryInvestors);
router.get("/discovery/projects", authenticate, requireApproval, controller.discoveryProjects);

router.get(
  "/relationships/mentorships",
  authenticate,
  requireApproval,
  controller.listMentorshipRelationships
);
router.get(
  "/relationships/investments",
  authenticate,
  requireApproval,
  controller.listInvestmentRelationships
);

router.patch(
  "/relationships/mentorships/:mentorshipId/status",
  authenticate,
  requireApproval,
  validate(mentorshipRelationshipStatusSchema),
  controller.updateMentorshipRelationshipStatus
);

router.patch(
  "/relationships/investments/:investmentId/status",
  authenticate,
  requireApproval,
  validate(investmentRelationshipStatusSchema),
  controller.updateInvestmentRelationshipStatus
);

router.post(
  "/mentorship-proposals",
  authenticate,
  requireApproval,
  upload.array("attachments"),
  validate(mentorshipProposalSchema),
  controller.createMentorshipProposal
);
router.get(
  "/mentorship-proposals/:proposalId",
  authenticate,
  requireApproval,
  controller.getMentorshipProposal
);
router.patch(
  "/mentorship-proposals/:proposalId/status",
  authenticate,
  requireApproval,
  validate(proposalStatusSchema),
  controller.updateMentorshipProposalStatus
);

router.post(
  "/investment-offers",
  authenticate,
  requireApproval,
  upload.array("attachments"),
  validate(investmentOfferSchema),
  controller.createInvestmentOffer
);
router.get(
  "/investment-offers/:offerId",
  authenticate,
  requireApproval,
  controller.getInvestmentOffer
);
router.patch(
  "/investment-offers/:offerId/status",
  authenticate,
  requireApproval,
  validate(offerStatusSchema),
  controller.updateInvestmentOfferStatus
);

router.post(
  "/funding-requests",
  authenticate,
  requireApproval,
  validate(fundingRequestSchema),
  controller.createFundingRequest
);
router.get(
  "/funding-requests/:requestId",
  authenticate,
  requireApproval,
  controller.getFundingRequest
);
router.patch(
  "/funding-requests/:requestId/status",
  authenticate,
  requireApproval,
  validate(fundingStatusSchema),
  controller.updateFundingRequestStatus
);

router.post(
  "/negotiations",
  authenticate,
  requireApproval,
  validate(negotiationSchema),
  controller.createNegotiation
);
router.get(
  "/negotiations/:parentType/:parentId",
  authenticate,
  requireApproval,
  controller.listNegotiations
);

module.exports = router;
