const mentorshipRequestModel = require("../models/mentorshipRequestModel");
const mentorshipSessionModel = require("../models/mentorshipSessionModel");
const startupModel = require("../models/startupModel");
const mentorModel = require("../models/mentorModel");

// Create mentorship request from startup to mentor
exports.createMentorshipRequest = async (startupId, mentorId, subject, message) => {
  // Verify startup exists
  const startup = await startupModel.findById(startupId);
  if (!startup) {
    throw { status: 404, message: "Startup not found" };
  }

  // Verify mentor exists
  const mentor = await mentorModel.findById(mentorId);
  if (!mentor) {
    throw { status: 404, message: "Mentor not found" };
  }

  // Create request
  const request = await mentorshipRequestModel.create({
    startupId,
    mentorId,
    subject,
    message,
    status: "pending",
  });

  return request;
};

// Respond to mentorship request (accept/reject)
exports.respondToMentorshipRequest = async (requestId, status, responderId) => {
  const request = await mentorshipRequestModel.findById(requestId);
  if (!request) {
    throw { status: 404, message: "Mentorship request not found" };
  }

  // Verify mentor is responding
  const mentor = await mentorModel.findById(request.mentor_id);
  if (!mentor || mentor.user_id !== responderId) {
    throw { status: 403, message: "Not authorized to respond to this request" };
  }

  // Update status
  const updated = await mentorshipRequestModel.updateStatus(requestId, status);

  // If accepted, create a mentorship session
  if (status === "accepted") {
    const session = await mentorshipSessionModel.create({
      mentorshipRequestId: requestId,
      startupId: request.startup_id,
      mentorId: request.mentor_id,
      status: "scheduled",
    });
    return { request: updated, session };
  }

  return { request: updated };
};

// Get mentorship requests for a startup
exports.getStartupMentorshipRequests = async (startupId) => {
  const requests = await mentorshipRequestModel.findByStartupId(startupId);
  return requests;
};

// Get mentorship requests for a mentor
exports.getMentorMentorshipRequests = async (mentorId) => {
  const requests = await mentorshipRequestModel.findByMentorId(mentorId);
  return requests;
};

// Schedule mentorship session
exports.scheduleMentorshipSession = async (requestId, sessionDate, duration) => {
  const request = await mentorshipRequestModel.findById(requestId);
  if (!request) {
    throw { status: 404, message: "Mentorship request not found" };
  }

  if (request.status !== "accepted") {
    throw { status: 400, message: "Can only schedule sessions for accepted requests" };
  }

  const session = await mentorshipSessionModel.create({
    mentorshipRequestId: requestId,
    startupId: request.startup_id,
    mentorId: request.mentor_id,
    sessionDate,
    duration,
    status: "scheduled",
  });

  return session;
};

// Complete mentorship session
exports.completeMentorshipSession = async (sessionId, notes) => {
  const session = await mentorshipSessionModel.findById(sessionId);
  if (!session) {
    throw { status: 404, message: "Mentorship session not found" };
  }

  const updated = await mentorshipSessionModel.update(sessionId, {
    status: "completed",
    notes,
  });

  return updated;
};

// Get mentorship sessions for mentor
exports.getMentorSessions = async (mentorId) => {
  const sessions = await mentorshipSessionModel.findByMentorId(mentorId);
  return sessions;
};

// Get mentorship sessions for startup
exports.getStartupSessions = async (startupId) => {
  const sessions = await mentorshipSessionModel.findByStartupId(startupId);
  return sessions;
};
