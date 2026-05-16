const service = require("../services/connectionLayerService");

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error(`Invalid ${label}`);
    err.status = 400;
    throw err;
  }
  return id;
}

exports.discoveryMentors = async (req, res) => {
  try {
    const data = await service.getDiscoveryMentors(req.query || {});
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.discoveryStartups = async (req, res) => {
  try {
    const data = await service.getDiscoveryStartups(req.query || {});
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.discoveryInvestors = async (req, res) => {
  try {
    const data = await service.getDiscoveryInvestors(req.query || {});
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.discoveryProjects = async (req, res) => {
  try {
    const data = await service.getDiscoveryProjects(req.query || {});
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.listMentorshipRelationships = async (req, res) => {
  try {
    const data = await service.listMentorshipRelationships({
      userId: req.user.user_id,
      status: req.query?.status,
    });
    return res.status(200).json({ relationships: data });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.listInvestmentRelationships = async (req, res) => {
  try {
    const data = await service.listInvestmentRelationships({
      userId: req.user.user_id,
      status: req.query?.status,
    });
    return res.status(200).json({ relationships: data });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateMentorshipRelationshipStatus = async (req, res) => {
  try {
    const relationship = await service.updateMentorshipRelationshipStatus({
      userId: req.user.user_id,
      mentorshipId: parseId(req.params.mentorshipId, "mentorshipId"),
      status: req.body.status,
    });
    return res.status(200).json({ message: "Mentorship relationship updated", relationship });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateInvestmentRelationshipStatus = async (req, res) => {
  try {
    const relationship = await service.updateInvestmentRelationshipStatus({
      userId: req.user.user_id,
      investmentId: parseId(req.params.investmentId, "investmentId"),
      status: req.body.status,
    });
    return res.status(200).json({ message: "Investment relationship updated", relationship });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.createMentorshipProposal = async (req, res) => {
  try {
    const proposal = await service.createMentorshipProposal({
      userId: req.user.user_id,
      body: req.validatedBody || req.body,
    });
    return res.status(201).json({ message: "Mentorship proposal created", proposal });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getMentorshipProposal = async (req, res) => {
  try {
    const proposal = await service.getMentorshipProposal({
      userId: req.user.user_id,
      mentorshipProposalId: parseId(req.params.proposalId, "proposalId"),
    });
    return res.status(200).json(proposal);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateMentorshipProposalStatus = async (req, res) => {
  try {
    const proposal = await service.updateMentorshipProposalStatus({
      userId: req.user.user_id,
      mentorshipProposalId: parseId(req.params.proposalId, "proposalId"),
      status: req.body.status,
    });
    return res.status(200).json({ message: "Mentorship proposal updated", proposal });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.createInvestmentOffer = async (req, res) => {
  try {
    const offer = await service.createInvestmentOffer({
      userId: req.user.user_id,
      body: req.validatedBody || req.body,
    });
    return res.status(201).json({ message: "Investment offer created", offer });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getInvestmentOffer = async (req, res) => {
  try {
    const offer = await service.getInvestmentOffer({
      userId: req.user.user_id,
      investmentOfferId: parseId(req.params.offerId, "offerId"),
    });
    return res.status(200).json(offer);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateInvestmentOfferStatus = async (req, res) => {
  try {
    const offer = await service.updateInvestmentOfferStatus({
      userId: req.user.user_id,
      investmentOfferId: parseId(req.params.offerId, "offerId"),
      status: req.body.status,
    });
    return res.status(200).json({ message: "Investment offer updated", offer });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.createFundingRequest = async (req, res) => {
  try {
    const fundingRequest = await service.createFundingRequest({
      userId: req.user.user_id,
      body: req.validatedBody || req.body,
    });
    return res
      .status(201)
      .json({ message: "Funding request created", funding_request: fundingRequest });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getFundingRequest = async (req, res) => {
  try {
    const fundingRequest = await service.getFundingRequest({
      userId: req.user.user_id,
      fundingRequestId: parseId(req.params.requestId, "requestId"),
    });
    return res.status(200).json(fundingRequest);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.updateFundingRequestStatus = async (req, res) => {
  try {
    const fundingRequest = await service.updateFundingRequestStatus({
      userId: req.user.user_id,
      fundingRequestId: parseId(req.params.requestId, "requestId"),
      status: req.body.status,
    });
    return res
      .status(200)
      .json({ message: "Funding request updated", funding_request: fundingRequest });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.createNegotiation = async (req, res) => {
  try {
    const negotiation = await service.createNegotiation({
      userId: req.user.user_id,
      body: req.validatedBody || req.body,
    });
    return res.status(201).json({ message: "Negotiation message created", negotiation });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.listNegotiations = async (req, res) => {
  try {
    const negotiations = await service.listNegotiations({
      userId: req.user.user_id,
      parentType: req.params.parentType,
      parentId: parseId(req.params.parentId, "parentId"),
    });
    return res.status(200).json({ negotiations });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};
