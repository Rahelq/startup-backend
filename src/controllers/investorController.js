const investorService = require("../services/investorService");

exports.getMyInvestorProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await investorService.getInvestorProfile(userId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.createInvestorProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await investorService.createInvestorProfile(
      userId,
      req.validatedBody || req.body,
      req.files
    );
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.updateInvestorProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await investorService.updateInvestorProfile(
      userId,
      req.validatedBody || req.body,
      req.files
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getAllInvestors = async (req, res) => {
  try {
    const rows = await investorService.listApprovedInvestors();
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteInvestorDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: "Invalid document ID" });
    }
    await investorService.deleteInvestorDocument(req.user.user_id, documentId);
    return res.status(200).json({ message: "Document deleted" });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.updateInvestorDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: "Invalid document ID" });
    }
    const file = req.files?.document?.[0];
    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }
    const result = await investorService.updateInvestorDocument(
      req.user.user_id,
      documentId,
      file
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.discoverStartups = async (req, res) => {
  try {
    const result = await investorService.searchStartups(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getStartupDetails = async (req, res) => {
  try {
    const startupId = Number(req.params.startupId);
    if (!Number.isInteger(startupId) || startupId <= 0) {
      return res.status(400).json({ error: "Invalid startup ID" });
    }
    const row = await investorService.getStartupDetails(startupId);
    return res.status(200).json(row);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getStartupRecommendations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await investorService.getRecommendations(userId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getInvestmentPortfolio = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await investorService.getDashboard(userId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};
