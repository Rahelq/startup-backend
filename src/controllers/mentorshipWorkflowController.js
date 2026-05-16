const mentorshipWorkflowService = require("../services/mentorshipWorkflowService");

function run(res, operation) {
  return operation()
    .then((result) => res.status(result.status || 200).json(result.data))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
}

exports.createMentorshipOffer = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.createMentorshipOffer({
      userId: req.user.user_id,
      role: req.user.role,
      body: req.body,
    })
  );

exports.getMentorshipOffer = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.getMentorshipOffer({
      userId: req.user.user_id,
      role: req.user.role,
      mentorshipId: req.params.mentorshipId,
    })
  );

exports.setMentorPricing = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.setMentorPricing({
      userId: req.user.user_id,
      mentorshipId: req.params.mentorshipId,
      body: req.body,
    })
  );

exports.bookSession = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.bookSession({
      userId: req.user.user_id,
      body: req.body,
    })
  );

exports.getMentorshipSessions = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.getMentorshipSessions({
      userId: req.user.user_id,
      role: req.user.role,
      mentorshipId: req.query.mentorship_id,
    })
  );

exports.recordSessionNotes = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.recordSessionNotes({
      userId: req.user.user_id,
      sessionId: req.params.sessionId,
      body: req.body,
    })
  );

exports.shareResource = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.shareResource({
      userId: req.user.user_id,
      body: req.body,
    })
  );

exports.getMyMentorships = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.getMyMentorships({
      userId: req.user.user_id,
    })
  );

exports.getReceivedMentorships = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.getReceivedMentorships({
      userId: req.user.user_id,
    })
  );

exports.getAllMentorships = async (req, res) =>
  run(res, () =>
    mentorshipWorkflowService.getAllMentorships({
      query: req.query,
    })
  );
