// Lightweight orchestrator that exposes a unified interaction API surface
// It delegates to the existing connectionLayerService and interactionController flows.
const connection = require("./connectionLayerService");

module.exports = {
  // Discovery
  discoverMentors: connection.getDiscoveryMentors,
  discoverStartups: connection.getDiscoveryStartups,
  discoverInvestors: connection.getDiscoveryInvestors,
  discoverProjects: connection.getDiscoveryProjects,

  // Relationships
  listMentorshipRelationships: connection.listMentorshipRelationships,
  listInvestmentRelationships: connection.listInvestmentRelationships,
  updateMentorshipRelationshipStatus: connection.updateMentorshipRelationshipStatus,
  updateInvestmentRelationshipStatus: connection.updateInvestmentRelationshipStatus,

  // Proposals / Offers / Funding
  createMentorshipProposal: connection.createMentorshipProposal,
  getMentorshipProposal: connection.getMentorshipProposal,
  updateMentorshipProposalStatus: connection.updateMentorshipProposalStatus,

  createInvestmentOffer: connection.createInvestmentOffer,
  getInvestmentOffer: connection.getInvestmentOffer,
  updateInvestmentOfferStatus: connection.updateInvestmentOfferStatus,

  createFundingRequest: connection.createFundingRequest,
  getFundingRequest: connection.getFundingRequest,
  updateFundingRequestStatus: connection.updateFundingRequestStatus,

  // Negotiations
  createNegotiation: connection.createNegotiation,
  listNegotiations: connection.listNegotiations,
};
