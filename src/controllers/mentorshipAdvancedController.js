const pool = require("../config/db");
const chatService = require("../services/chatService");
const documentUploadService = require("../services/documentUploadService");

async function getStartupIdByUserId(userId) {
  const result = await pool.query("SELECT startup_id FROM startups WHERE user_id = $1", [userId]);
  return result.rowCount ? result.rows[0].startup_id : null;
}

async function getMentorIdByUserId(userId) {
  const result = await pool.query("SELECT mentor_id FROM mentors WHERE user_id = $1", [userId]);
  return result.rowCount ? result.rows[0].mentor_id : null;
}

async function getMentorUserIdByMentorId(mentorId) {
  const result = await pool.query("SELECT user_id FROM mentors WHERE mentor_id = $1", [mentorId]);
  return result.rowCount ? result.rows[0].user_id : null;
}

async function getMentorshipPair(startupId, mentorId) {
  const result = await pool.query(
    `SELECT mentorship_request_id, status
     FROM mentorship_requests
     WHERE startup_id = $1 AND mentor_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [startupId, mentorId]
  );

  return result.rowCount ? result.rows[0] : null;
}

function parsePossibleJson(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function ensureMentorOrStartupRole(role) {
  return role === "Mentor" || role === "Startup";
}

exports.listMentorshipSessions = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;

    if (!ensureMentorOrStartupRole(role)) {
      return res.status(403).json({
        error: "Only Startup and Mentor roles can view mentorship sessions",
      });
    }

    const startupId = role === "Startup" ? await getStartupIdByUserId(userId) : null;
    const mentorId = role === "Mentor" ? await getMentorIdByUserId(userId) : null;

    if (role === "Startup" && !startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    if (role === "Mentor" && !mentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    const params = role === "Startup" ? [startupId] : [mentorId];
    const condition = role === "Startup" ? "mr.startup_id = $1" : "mr.mentor_id = $1";

    const result = await pool.query(
      `SELECT
         ms.*,
         mr.startup_id,
         mr.mentor_id,
         mr.subject,
         mr.status AS request_status,
         s.startup_name,
         m.headline,
         su.first_name AS startup_owner_first_name,
         su.last_name AS startup_owner_last_name,
         su.email AS startup_owner_email,
         mu.first_name AS mentor_first_name,
         mu.last_name AS mentor_last_name,
         mu.email AS mentor_email
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       JOIN startups s ON s.startup_id = mr.startup_id
       JOIN mentors m ON m.mentor_id = mr.mentor_id
       JOIN users su ON su.user_id = s.user_id
       JOIN users mu ON mu.user_id = m.user_id
       WHERE ${condition}
       ORDER BY ms.scheduled_at DESC`,
      params
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getMentorshipSessionById = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;
    const sessionId = Number(req.params.sessionId);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    if (!ensureMentorOrStartupRole(role)) {
      return res.status(403).json({
        error: "Only Startup and Mentor roles can view mentorship sessions",
      });
    }

    const startupId = role === "Startup" ? await getStartupIdByUserId(userId) : null;
    const mentorId = role === "Mentor" ? await getMentorIdByUserId(userId) : null;

    if (role === "Startup" && !startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    if (role === "Mentor" && !mentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    const condition = role === "Startup" ? "mr.startup_id = $2" : "mr.mentor_id = $2";
    const params = role === "Startup" ? [sessionId, startupId] : [sessionId, mentorId];

    const result = await pool.query(
      `SELECT
         ms.*,
         mr.startup_id,
         mr.mentor_id,
         mr.subject,
         mr.status AS request_status,
         s.startup_name,
         m.headline,
         su.first_name AS startup_owner_first_name,
         su.last_name AS startup_owner_last_name,
         su.email AS startup_owner_email,
         mu.first_name AS mentor_first_name,
         mu.last_name AS mentor_last_name,
         mu.email AS mentor_email
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       JOIN startups s ON s.startup_id = mr.startup_id
       JOIN mentors m ON m.mentor_id = mr.mentor_id
       JOIN users su ON su.user_id = s.user_id
       JOIN users mu ON mu.user_id = m.user_id
       WHERE ms.mentorship_session_id = $1 AND ${condition}`,
      params
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Mentorship session not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.createMentorshipReport = async (req, res) => {
  try {
    const { user_id: userId } = req.user;
    const mentorId = await getMentorIdByUserId(userId);

    if (!mentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    let {
      mentorship_session_id,
      report_title,
      summary,
      action_items,
      next_steps,
      progress_rating,
      startup_feedback,
      mentor_notes,
    } = req.body || {};

    const sessionId = Number(mentorship_session_id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: "'mentorship_session_id' must be a valid integer" });
    }

    if (!report_title || typeof report_title !== "string") {
      return res.status(400).json({ error: "'report_title' is required" });
    }

    if (!summary || typeof summary !== "string") {
      return res.status(400).json({ error: "'summary' is required" });
    }

    if (progress_rating !== undefined && progress_rating !== null && progress_rating !== "") {
      const rating = Number(progress_rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: "'progress_rating' must be an integer between 1 and 5",
        });
      }
      progress_rating = rating;
    } else {
      progress_rating = null;
    }

    const sessionCheck = await pool.query(
      `SELECT ms.mentorship_session_id, ms.mentorship_request_id, mr.startup_id, mr.mentor_id
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       WHERE ms.mentorship_session_id = $1 AND mr.mentor_id = $2`,
      [sessionId, mentorId]
    );

    if (!sessionCheck.rowCount) {
      return res.status(404).json({ error: "Mentorship session not found" });
    }

    const startupId = sessionCheck.rows[0].startup_id;
    const mentorshipRequestId = sessionCheck.rows[0].mentorship_request_id;

    const result = await pool.query(
      `INSERT INTO mentorship_reports (
				 mentorship_request_id,
				 mentorship_session_id,
				 startup_id,
				 mentor_id,
				 report_title,
				 summary,
				 action_items,
				 next_steps,
				 progress_rating,
				 startup_feedback,
				 mentor_notes
			 )
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			 ON CONFLICT (mentorship_session_id)
			 DO UPDATE SET
				 report_title = EXCLUDED.report_title,
				 summary = EXCLUDED.summary,
				 action_items = EXCLUDED.action_items,
				 next_steps = EXCLUDED.next_steps,
				 progress_rating = EXCLUDED.progress_rating,
				 startup_feedback = EXCLUDED.startup_feedback,
				 mentor_notes = EXCLUDED.mentor_notes
			 RETURNING *`,
      [
        mentorshipRequestId,
        sessionId,
        startupId,
        mentorId,
        report_title.trim(),
        summary.trim(),
        JSON.stringify(parsePossibleJson(action_items)),
        JSON.stringify(parsePossibleJson(next_steps)),
        progress_rating,
        startup_feedback || null,
        mentor_notes || null,
      ]
    );

    return res.status(201).json({
      message: "Mentorship report saved",
      mentorship_report: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getMentorshipReports = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;

    if (!ensureMentorOrStartupRole(role)) {
      return res.status(403).json({
        error: "Only Startup and Mentor roles can view mentorship reports",
      });
    }

    const startupId = role === "Startup" ? await getStartupIdByUserId(userId) : null;
    const mentorId = role === "Mentor" ? await getMentorIdByUserId(userId) : null;

    if (role === "Startup" && !startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    if (role === "Mentor" && !mentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    const condition = role === "Startup" ? "r.startup_id = $1" : "r.mentor_id = $1";
    const params = role === "Startup" ? [startupId] : [mentorId];

    const result = await pool.query(
      `SELECT
         r.*,
         s.startup_name,
         m.headline,
         su.first_name AS startup_owner_first_name,
         su.last_name AS startup_owner_last_name,
         su.email AS startup_owner_email,
         mu.first_name AS mentor_first_name,
         mu.last_name AS mentor_last_name,
         mu.email AS mentor_email
       FROM mentorship_reports r
       JOIN startups s ON s.startup_id = r.startup_id
       JOIN mentors m ON m.mentor_id = r.mentor_id
       JOIN users su ON su.user_id = s.user_id
       JOIN users mu ON mu.user_id = m.user_id
       WHERE ${condition}
       ORDER BY r.created_at DESC`,
      params
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.shareMentorshipResource = async (req, res) => {
  try {
    const { user_id: userId } = req.user;
    const mentorId = await getMentorIdByUserId(userId);

    if (!mentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    let {
      mentorship_request_id,
      mentorship_session_id,
      resource_title,
      resource_description,
      resource_type,
      external_url,
    } = req.body || {};

    const requestId = Number(mentorship_request_id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ error: "'mentorship_request_id' must be a valid integer" });
    }

    if (!resource_title || typeof resource_title !== "string") {
      return res.status(400).json({ error: "'resource_title' is required" });
    }

    if (!resource_type) {
      resource_type = req.file ? "file" : external_url ? "link" : "note";
    }

    const allowedTypes = ["file", "link", "note"];
    if (!allowedTypes.includes(resource_type)) {
      return res.status(400).json({ error: "'resource_type' must be file, link, or note" });
    }

    const requestCheck = await pool.query(
      `SELECT mr.startup_id, mr.mentor_id
       FROM mentorship_requests mr
       WHERE mr.mentorship_request_id = $1 AND mr.mentor_id = $2`,
      [requestId, mentorId]
    );

    if (!requestCheck.rowCount) {
      return res.status(404).json({ error: "Mentorship request not found" });
    }

    if (
      mentorship_session_id !== undefined &&
      mentorship_session_id !== null &&
      mentorship_session_id !== ""
    ) {
      const sessionId = Number(mentorship_session_id);
      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({ error: "'mentorship_session_id' must be a valid integer" });
      }

      const sessionCheck = await pool.query(
        `SELECT ms.mentorship_session_id
         FROM mentorship_sessions ms
         WHERE ms.mentorship_session_id = $1 AND ms.mentorship_request_id = $2`,
        [sessionId, requestId]
      );

      if (!sessionCheck.rowCount) {
        return res.status(404).json({ error: "Mentorship session not found for the request" });
      }

      mentorship_session_id = sessionId;
    } else {
      mentorship_session_id = null;
    }

    const startupId = requestCheck.rows[0].startup_id;

    // If a file is uploaded, persist it to Cloudinary and create a documents record
    let uploadedFile = null;
    if (req.file) {
      const saved = await documentUploadService.saveUploadedFile(req.file, {
        userId: userId,
        startupId: startupId,
        documentType: "mentorship_resource",
        contextType: "mentorship_resource",
        contextId: requestId,
        description: resource_description || null,
      });
      uploadedFile = {
        file_name: saved.file_name || saved.original_name || req.file.originalname,
        file_path: saved.file_url || saved.file_path || null,
        mime_type: saved.mime_type || req.file.mimetype,
        file_size_bytes: saved.file_size_bytes || req.file.size,
      };
    }
    if (resource_type === "file" && !uploadedFile) {
      return res.status(400).json({ error: "A file is required when resource_type is 'file'" });
    }

    const result = await pool.query(
      `INSERT INTO mentorship_resources (
         mentorship_request_id,
         mentorship_session_id,
         startup_id,
         mentor_id,
         resource_title,
         resource_description,
         resource_type,
         file_name,
         file_path,
         file_type,
         file_size_bytes,
         external_url
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        requestId,
        mentorship_session_id,
        startupId,
        mentorId,
        resource_title.trim(),
        resource_description || null,
        resource_type,
        uploadedFile ? uploadedFile.file_name : null,
        uploadedFile ? uploadedFile.file_path : null,
        uploadedFile ? uploadedFile.mime_type : null,
        uploadedFile ? uploadedFile.file_size_bytes : null,
        external_url || null,
      ]
    );

    return res.status(201).json({
      message: "Mentorship resource shared",
      mentorship_resource: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getMentorshipResources = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;

    if (!ensureMentorOrStartupRole(role)) {
      return res.status(403).json({
        error: "Only Startup and Mentor roles can view mentorship resources",
      });
    }

    const startupId = role === "Startup" ? await getStartupIdByUserId(userId) : null;
    const mentorId = role === "Mentor" ? await getMentorIdByUserId(userId) : null;

    if (role === "Startup" && !startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    if (role === "Mentor" && !mentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    const condition = role === "Startup" ? "r.startup_id = $1" : "r.mentor_id = $1";
    const params = role === "Startup" ? [startupId] : [mentorId];

    const result = await pool.query(
      `SELECT
         r.*,
         s.startup_name,
         m.headline,
         su.first_name AS startup_owner_first_name,
         su.last_name AS startup_owner_last_name,
         su.email AS startup_owner_email,
         mu.first_name AS mentor_first_name,
         mu.last_name AS mentor_last_name,
         mu.email AS mentor_email
       FROM mentorship_resources r
       JOIN startups s ON s.startup_id = r.startup_id
       JOIN mentors m ON m.mentor_id = r.mentor_id
       JOIN users su ON su.user_id = s.user_id
       JOIN users mu ON mu.user_id = m.user_id
       WHERE ${condition}
       ORDER BY r.created_at DESC`,
      params
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const socketUtils = require("../utils/socket");
const mentorshipProgressService = require("../services/mentorshipProgressService");

exports.sendMentorshipMessage = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;
    const { other_user_id, body } = req.body || {};

    const otherUserId = Number(other_user_id);
    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({ error: "'other_user_id' must be a valid integer" });
    }

    if (!body || typeof body !== "string" || body.trim() === "") {
      return res.status(400).json({ error: "'body' is required" });
    }

    if (!ensureMentorOrStartupRole(role)) {
      return res.status(403).json({
        error: "Only Startup and Mentor roles can send mentorship chat messages",
      });
    }

    const senderStartupId = role === "Startup" ? await getStartupIdByUserId(userId) : null;
    const senderMentorId = role === "Mentor" ? await getMentorIdByUserId(userId) : null;

    if (role === "Startup" && !senderStartupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    if (role === "Mentor" && !senderMentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    const otherMentorId = await getMentorIdByUserId(otherUserId);
    const otherStartupId = await getStartupIdByUserId(otherUserId);

    let startupId = null;
    let mentorId = null;

    if (role === "Startup") {
      if (!otherMentorId) {
        return res.status(404).json({ error: "Receiver must be a mentor" });
      }
      startupId = senderStartupId;
      mentorId = otherMentorId;
    } else {
      if (!otherStartupId) {
        return res.status(404).json({ error: "Receiver must be a startup" });
      }
      startupId = otherStartupId;
      mentorId = senderMentorId;
    }

    const pair = await getMentorshipPair(startupId, mentorId);
    if (!pair) {
      return res.status(404).json({
        error: "No mentorship relationship exists between these users",
      });
    }

    const conversation = await chatService.createConversation(userId, otherUserId, "mentor_chat");
    const msg = await chatService.sendMessage({
      conversationId: conversation.conversation_id,
      senderId: userId,
      receiverId: otherUserId,
      message: body.trim(),
      messageType: "text",
    });

    // compute unread count for recipient and emit events
    try {
      const io = socketUtils.getIO();
      const unreadCount = await chatService.getUnreadCount(otherUserId);
      if (io) {
        const room = socketUtils.getPairRoom(userId, otherUserId);
        const conversationRoom = `conversation:${conversation.conversation_id}`;
        if (room) io.to(room).emit("message:new", msg);
        io.to(conversationRoom).emit("receive_message", msg);
        io.to(`user:${otherUserId}`).emit("message:new", msg);
        io.to(`user:${userId}`).emit("message:new", msg);
        io.to(`user:${otherUserId}`).emit("unread:count", {
          user_id: otherUserId,
          count: unreadCount,
        });
      }
    } catch (e) {
      console.error("Socket emit failed:", e.message || e);
    }

    return res.status(201).json({ message: "Mentorship chat message sent", chat_message: msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getMentorshipConversation = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;
    const otherUserId = Number(req.params.otherUserId);

    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({ error: "Invalid other user id" });
    }

    if (!ensureMentorOrStartupRole(role)) {
      return res.status(403).json({
        error: "Only Startup and Mentor roles can view mentorship chats",
      });
    }

    const senderStartupId = role === "Startup" ? await getStartupIdByUserId(userId) : null;
    const senderMentorId = role === "Mentor" ? await getMentorIdByUserId(userId) : null;

    if (role === "Startup" && !senderStartupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    if (role === "Mentor" && !senderMentorId) {
      return res.status(404).json({ error: "Mentor profile not found" });
    }

    const otherMentorId = await getMentorIdByUserId(otherUserId);
    const otherStartupId = await getStartupIdByUserId(otherUserId);

    let startupId = null;
    let mentorId = null;

    if (role === "Startup") {
      if (!otherMentorId) {
        return res.status(404).json({ error: "Receiver must be a mentor" });
      }
      startupId = senderStartupId;
      mentorId = otherMentorId;
    } else {
      if (!otherStartupId) {
        return res.status(404).json({ error: "Receiver must be a startup" });
      }
      startupId = otherStartupId;
      mentorId = senderMentorId;
    }

    const pair = await getMentorshipPair(startupId, mentorId);
    if (!pair) {
      return res.status(404).json({
        error: "No mentorship relationship exists between these users",
      });
    }

    const conversation = await chatService.getConversationByParticipants(
      userId,
      otherUserId,
      "mentor_chat"
    );
    if (!conversation) {
      return res.status(200).json([]);
    }

    const payload = await chatService.getConversationMessages(
      conversation.conversation_id,
      userId,
      1,
      100
    );

    return res.status(200).json(payload.messages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.createMentorshipPayment = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;

    if (role !== "Startup") {
      return res.status(403).json({ error: "Only Startup users can create mentorship payments" });
    }

    const startupId = await getStartupIdByUserId(userId);
    if (!startupId) {
      return res.status(404).json({ error: "Startup profile not found" });
    }

    const { mentorship_session_id, amount, payment_method, currency, status } = req.body || {};

    const sessionId = Number(mentorship_session_id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: "'mentorship_session_id' must be a valid integer" });
    }

    const paymentAmount = Number(amount);
    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: "'amount' must be a positive number" });
    }

    const sessionResult = await pool.query(
      `SELECT ms.mentorship_session_id, mr.startup_id, mr.mentor_id, mr.status AS request_status
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       WHERE ms.mentorship_session_id = $1 AND mr.startup_id = $2`,
      [sessionId, startupId]
    );

    if (!sessionResult.rowCount) {
      return res.status(404).json({ error: "Mentorship session not found" });
    }

    const mentorUserId = await getMentorUserIdByMentorId(sessionResult.rows[0].mentor_id);
    if (!mentorUserId) {
      return res.status(404).json({ error: "Mentor user not found" });
    }

    const paymentStatus = status || "completed";
    const result = await pool.query(
      `INSERT INTO payments (
         from_user_id,
         to_user_id,
         amount,
         currency,
         payment_method,
         status,
         reference_type,
         reference_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,'MENTORSHIP_SESSION',$7)
       RETURNING *`,
      [
        userId,
        mentorUserId,
        paymentAmount,
        currency || "USD",
        payment_method || "manual",
        paymentStatus,
        sessionId,
      ]
    );

    return res.status(201).json({
      message: "Mentorship payment recorded",
      payment: result.rows[0],
      receipt: {
        payment_id: result.rows[0].payment_id,
        reference_type: result.rows[0].reference_type,
        reference_id: result.rows[0].reference_id,
        amount: result.rows[0].amount,
        currency: result.rows[0].currency,
        status: result.rows[0].status,
        from_user_id: result.rows[0].from_user_id,
        to_user_id: result.rows[0].to_user_id,
        payment_method: result.rows[0].payment_method,
        created_at: result.rows[0].created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.recordProgress = async (req, res) => {
  try {
    const { user_id: userId } = req.user;
    const { mentorship_request_id, mentorship_session_id, notes, rating, metadata } =
      req.body || {};

    const mentorshipRequestId = Number(mentorship_request_id);
    if (!Number.isInteger(mentorshipRequestId) || mentorshipRequestId <= 0) {
      return res.status(400).json({ error: "'mentorship_request_id' must be a valid integer" });
    }

    const rec = await mentorshipProgressService.recordProgress({
      userId,
      mentorshipRequestId,
      mentorshipSessionId: mentorship_session_id || null,
      notes: notes || null,
      rating: rating || null,
      metadata: metadata || null,
    });

    return res.status(201).json({ message: "Progress recorded", progress: rec });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const { user_id: userId } = req.user;
    const mentorshipRequestId = Number(
      req.query.mentorship_request_id || req.params.mentorshipRequestId
    );
    if (!Number.isInteger(mentorshipRequestId) || mentorshipRequestId <= 0) {
      return res.status(400).json({ error: "'mentorship_request_id' must be a valid integer" });
    }
    const rows = await mentorshipProgressService.listProgressForMentorship({
      userId,
      mentorshipRequestId,
    });
    return res.status(200).json({ progress: rows });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getMentorshipPayments = async (req, res) => {
  try {
    const { user_id: userId, role } = req.user;

    if (!ensureMentorOrStartupRole(role) && role !== "Admin") {
      return res.status(403).json({
        error: "Only Startup, Mentor, or Admin roles can view mentorship payments",
      });
    }

    let condition = "p.reference_type = 'MENTORSHIP_SESSION'";
    const params = [];

    if (role === "Startup") {
      condition += " AND p.from_user_id = $1";
      params.push(userId);
    } else if (role === "Mentor") {
      condition += " AND p.to_user_id = $1";
      params.push(userId);
    }

    const result = await pool.query(
      `SELECT
         p.*,
         sf.first_name AS sender_first_name,
         sf.last_name AS sender_last_name,
         tf.first_name AS receiver_first_name,
         tf.last_name AS receiver_last_name
       FROM payments p
       JOIN users sf ON sf.user_id = p.from_user_id
       JOIN users tf ON tf.user_id = p.to_user_id
       WHERE ${condition}
       ORDER BY p.created_at DESC`,
      params
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.adminMentorshipOverview = async (_req, res) => {
  try {
    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM mentorship_requests) AS mentorship_requests,
         (SELECT COUNT(*)::int FROM mentorship_sessions) AS mentorship_sessions,
         (SELECT COUNT(*)::int FROM mentorship_reports) AS mentorship_reports,
         (SELECT COUNT(*)::int FROM mentorship_resources) AS mentorship_resources,
         (SELECT COUNT(*)::int FROM payments WHERE reference_type = 'MENTORSHIP_SESSION') AS mentorship_payments`
    );

    const latestRequests = await pool.query(
      `SELECT mr.*, s.startup_name, m.headline
       FROM mentorship_requests mr
       JOIN startups s ON s.startup_id = mr.startup_id
       JOIN mentors m ON m.mentor_id = mr.mentor_id
       ORDER BY mr.created_at DESC
       LIMIT 10`
    );

    const latestSessions = await pool.query(
      `SELECT ms.*, mr.startup_id, mr.mentor_id, s.startup_name
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       JOIN startups s ON s.startup_id = mr.startup_id
       ORDER BY ms.created_at DESC
       LIMIT 10`
    );

    const latestReports = await pool.query(
      `SELECT r.*, s.startup_name, m.headline
       FROM mentorship_reports r
       JOIN startups s ON s.startup_id = r.startup_id
       JOIN mentors m ON m.mentor_id = r.mentor_id
       ORDER BY r.created_at DESC
       LIMIT 10`
    );

    const latestResources = await pool.query(
      `SELECT r.*, s.startup_name, m.headline
       FROM mentorship_resources r
       JOIN startups s ON s.startup_id = r.startup_id
       JOIN mentors m ON m.mentor_id = r.mentor_id
       ORDER BY r.created_at DESC
       LIMIT 10`
    );

    const latestPayments = await pool.query(
      `SELECT p.*, sf.first_name AS sender_first_name, tf.first_name AS receiver_first_name
       FROM payments p
       JOIN users sf ON sf.user_id = p.from_user_id
       JOIN users tf ON tf.user_id = p.to_user_id
       WHERE p.reference_type = 'MENTORSHIP_SESSION'
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    return res.status(200).json({
      counts: counts.rows[0],
      latest_requests: latestRequests.rows,
      latest_sessions: latestSessions.rows,
      latest_reports: latestReports.rows,
      latest_resources: latestResources.rows,
      latest_payments: latestPayments.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.adminListMentorshipRequests = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*, s.startup_name, m.headline, su.email AS startup_email, mu.email AS mentor_email
       FROM mentorship_requests mr
       JOIN startups s ON s.startup_id = mr.startup_id
       JOIN mentors m ON m.mentor_id = mr.mentor_id
       JOIN users su ON su.user_id = s.user_id
       JOIN users mu ON mu.user_id = m.user_id
       ORDER BY mr.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.adminListMentorshipSessions = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ms.*, mr.startup_id, mr.mentor_id, s.startup_name, m.headline
       FROM mentorship_sessions ms
       JOIN mentorship_requests mr ON mr.mentorship_request_id = ms.mentorship_request_id
       JOIN startups s ON s.startup_id = mr.startup_id
       JOIN mentors m ON m.mentor_id = mr.mentor_id
       ORDER BY ms.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.adminListMentorshipReports = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, s.startup_name, m.headline
       FROM mentorship_reports r
       JOIN startups s ON s.startup_id = r.startup_id
       JOIN mentors m ON m.mentor_id = r.mentor_id
       ORDER BY r.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.adminListMentorshipResources = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, s.startup_name, m.headline
       FROM mentorship_resources r
       JOIN startups s ON s.startup_id = r.startup_id
       JOIN mentors m ON m.mentor_id = r.mentor_id
       ORDER BY r.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.adminListMentorshipPayments = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, sf.first_name AS sender_first_name, tf.first_name AS receiver_first_name
       FROM payments p
       JOIN users sf ON sf.user_id = p.from_user_id
       JOIN users tf ON tf.user_id = p.to_user_id
       WHERE p.reference_type = 'MENTORSHIP_SESSION'
       ORDER BY p.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
