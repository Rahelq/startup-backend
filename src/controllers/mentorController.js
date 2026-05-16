const mentorService = require("../services/mentorService");
const connectionLayerService = require("../services/connectionLayerService");

exports.createMentorProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await mentorService.createMentorProfile(userId, req.body, req.files || req.file);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getAllMentors = async (req, res) => {
  try {
    // Use centralized discovery service for mentor discovery to avoid duplicated logic
    const data = await connectionLayerService.getDiscoveryMentors(req.query || {});
    // legacy endpoints expect an array of mentors — return items when service returns a paginated object
    if (data && Array.isArray(data.items)) return res.status(200).json(data.items);
    return res.status(200).json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getMentorById = async (req, res) => {
  try {
    const mentorId = Number(req.params.mentorId);
    if (!Number.isInteger(mentorId) || mentorId <= 0) {
      return res.status(400).json({ error: "Invalid mentor ID" });
    }
    const row = await mentorService.getMentorById(mentorId);
    return res.status(200).json(row);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await mentorService.getMentorProfile(userId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.updateMentorProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await mentorService.updateMentorProfile(userId, req.body, req.files || req.file);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.deleteMentorDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: "Invalid document ID" });
    }
    await mentorService.deleteMentorDocument(req.user.user_id, documentId);
    return res.status(200).json({ message: "Document deleted" });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.replaceMentorDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: "Invalid document ID" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }
    const result = await mentorService.replaceMentorDocument(
      req.user.user_id,
      documentId,
      req.file
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};
