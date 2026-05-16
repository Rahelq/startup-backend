const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const cloudinarySvc = require("./cloudinaryService");
const documentUploadService = require("./documentUploadService");
const notificationService = require("./notificationService");

function normalizeUserId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeConversationType(value) {
  const normalized = (value || "direct").toString().trim().toLowerCase();
  if (["mentor_chat", "investment_chat", "direct"].includes(normalized)) {
    return normalized;
  }
  return "direct";
}

function normalizeMessageType(value) {
  const normalized = (value || "text").toString().trim().toLowerCase();
  if (["text", "image", "file", "system"].includes(normalized)) {
    return normalized;
  }
  return "text";
}

function safeAttachmentPath(filePath) {
  if (!filePath) return null;
  if (String(filePath).startsWith("http://") || String(filePath).startsWith("https://")) {
    return String(filePath);
  }
  const normalized = path.normalize(String(filePath));
  if (!normalized || normalized.includes("..")) return null;
  return normalized;
}

async function resolveAttachmentPath(attachment) {
  if (!attachment) return null;
  if (attachment.buffer?.length) {
    // Upload buffer to Cloudinary and create a documents record
    try {
      const saved = await documentUploadService.saveUploadedFile(attachment, {
        userId: null,
        startupId: null,
        documentType: "chat_attachment",
        contextType: "chat",
        contextId: null,
        description: null,
      });
      return saved.file_url || saved.file_path || null;
    } catch {
      return null;
    }
  }
  return safeAttachmentPath(attachment.path);
}

function getOrderedPair(userA, userB) {
  const first = normalizeUserId(userA);
  const second = normalizeUserId(userB);
  if (!first || !second || first === second) return null;
  return first < second ? [first, second] : [second, first];
}

async function getStartupIdByUserId(userId) {
  const result = await pool.query("SELECT startup_id FROM startups WHERE user_id = $1", [userId]);
  return result.rowCount ? result.rows[0].startup_id : null;
}

async function getInvestorIdByUserId(userId) {
  const result = await pool.query("SELECT investor_id FROM investors WHERE user_id = $1", [userId]);
  return result.rowCount ? result.rows[0].investor_id : null;
}

async function getUserRoleByUserId(userId) {
  const result = await pool.query("SELECT role FROM users WHERE user_id = $1", [userId]);
  return result.rowCount ? result.rows[0].role : null;
}

async function getMentorIdByUserId(userId) {
  const result = await pool.query("SELECT mentor_id FROM mentors WHERE user_id = $1", [userId]);
  return result.rowCount ? result.rows[0].mentor_id : null;
}

async function hasMentorshipRelationship(userA, userB) {
  // Only allow chat if there's an active mentorship relationship
  const result = await pool.query(
    `SELECT 1
     FROM mentorship_relationships mr
     JOIN users u_mentor ON u_mentor.user_id = mr.mentor_id
     JOIN users u_startup ON u_startup.user_id = mr.startup_id
     WHERE mr.status = 'active' AND (
        (u_startup.user_id = $1 AND u_mentor.user_id = $2)
        OR (u_startup.user_id = $2 AND u_mentor.user_id = $1)
     )
     LIMIT 1`,
    [userA, userB]
  );
  return result.rowCount > 0;
}

async function hasInvestmentRelationship(userA, userB) {
  // Only allow chat if there's an active investment relationship
  const result = await pool.query(
    `SELECT 1
     FROM investment_relationships ir
     JOIN users u_investor ON u_investor.user_id = ir.investor_id
     JOIN users u_startup ON u_startup.user_id = ir.startup_id
     WHERE (ir.status = 'active' OR ir.status = 'accepted')
       AND (
         (u_startup.user_id = $1 AND u_investor.user_id = $2)
         OR (u_startup.user_id = $2 AND u_investor.user_id = $1)
       )
     LIMIT 1`,
    [userA, userB]
  );
  return result.rowCount > 0;
}

async function canUsersChat(userA, userB, conversationType = "direct") {
  const type = normalizeConversationType(conversationType);
  if (type === "mentor_chat") {
    return hasMentorshipRelationship(userA, userB);
  }
  if (type === "investment_chat") {
    return hasInvestmentRelationship(userA, userB);
  }
  return (
    (await hasMentorshipRelationship(userA, userB)) ||
    (await hasInvestmentRelationship(userA, userB))
  );
}

async function getConversationByParticipants(userA, userB, conversationType) {
  const pair = getOrderedPair(userA, userB);
  if (!pair) return null;
  if (!conversationType) {
    const result = await pool.query(
      `SELECT *
		     FROM conversations
		     WHERE user1_id = $1 AND user2_id = $2
		     ORDER BY created_at DESC
		     LIMIT 1`,
      [pair[0], pair[1]]
    );
    return result.rowCount ? result.rows[0] : null;
  }
  const type = normalizeConversationType(conversationType);
  const result = await pool.query(
    `SELECT *
	     FROM conversations
	     WHERE user1_id = $1 AND user2_id = $2 AND conversation_type = $3
	     LIMIT 1`,
    [pair[0], pair[1], type]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function inferConversationType(userA, userB) {
  const roleA = await getUserRoleByUserId(userA);
  const roleB = await getUserRoleByUserId(userB);
  const roles = new Set([roleA, roleB]);
  if (roles.has("Mentor") && roles.has("Startup")) return "mentor_chat";
  if (roles.has("Investor") && roles.has("Startup")) return "investment_chat";
  return "direct";
}

async function markUserLastSeen(userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return 0;
  const result = await pool.query(
    "UPDATE users SET last_seen_at = NOW() WHERE user_id = $1 RETURNING user_id",
    [uid]
  );
  return result.rowCount;
}

async function createConversation(userA, userB, conversationType) {
  const pair = getOrderedPair(userA, userB);
  if (!pair) {
    throw new Error("Invalid conversation participants");
  }

  const type = conversationType
    ? normalizeConversationType(conversationType)
    : await inferConversationType(pair[0], pair[1]);
  if (!(await canUsersChat(pair[0], pair[1], type))) {
    throw new Error("Not authorized to start this conversation");
  }

  const existing = await getConversationByParticipants(pair[0], pair[1], type);
  if (existing) return existing;

  const result = await pool.query(
    `INSERT INTO conversations (user1_id, user2_id, conversation_type)
	     VALUES ($1, $2, $3)
	     RETURNING *`,
    [pair[0], pair[1], type]
  );
  return result.rows[0];
}

async function getConversationById(conversationId) {
  const result = await pool.query("SELECT * FROM conversations WHERE conversation_id = $1", [
    conversationId,
  ]);
  return result.rowCount ? result.rows[0] : null;
}

async function assertConversationAccess(conversationId, userId) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const uid = normalizeUserId(userId);
  if (uid !== conversation.user1_id && uid !== conversation.user2_id) {
    throw new Error("Not authorized for this conversation");
  }
  return conversation;
}

async function listConversationsForUser(userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return [];
  const result = await pool.query(
    `SELECT
			c.*,
			u1.first_name AS user1_first_name,
			u1.last_name AS user1_last_name,
			u1.email AS user1_email,
			u1.last_seen_at AS user1_last_seen_at,
			u2.first_name AS user2_first_name,
			u2.last_name AS user2_last_name,
			u2.email AS user2_email,
			u2.last_seen_at AS user2_last_seen_at,
			(
				SELECT COUNT(*)::int
				FROM messages m
				WHERE m.conversation_id = c.conversation_id
				  AND m.receiver_user_id = $1
				  AND COALESCE(m.status, 'sent') <> 'seen'
			) AS unread_count,
			(
				SELECT m.body
				FROM messages m
				WHERE m.conversation_id = c.conversation_id
				ORDER BY m.created_at DESC, m.message_id DESC
				LIMIT 1
			) AS last_message_body,
			(
				SELECT m.created_at
				FROM messages m
				WHERE m.conversation_id = c.conversation_id
				ORDER BY m.created_at DESC, m.message_id DESC
				LIMIT 1
			) AS last_message_at
		 FROM conversations c
		 JOIN users u1 ON u1.user_id = c.user1_id
		 JOIN users u2 ON u2.user_id = c.user2_id
		 WHERE c.user1_id = $1 OR c.user2_id = $1
		 ORDER BY COALESCE(
				(
					SELECT m.created_at
					FROM messages m
					WHERE m.conversation_id = c.conversation_id
					ORDER BY m.created_at DESC, m.message_id DESC
					LIMIT 1
				),
				c.updated_at,
				c.created_at
			) DESC`,
    [uid]
  );
  return result.rows;
}

async function getConversationMessages(conversationId, userId, page = 1, limit = 20) {
  const conversation = await assertConversationAccess(conversationId, userId);
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;
  const result = await pool.query(
    `SELECT
			m.*,
			su.first_name AS sender_first_name,
			su.last_name AS sender_last_name,
			ru.first_name AS receiver_first_name,
			ru.last_name AS receiver_last_name
		 FROM messages m
		 JOIN users su ON su.user_id = m.sender_user_id
		 JOIN users ru ON ru.user_id = m.receiver_user_id
		 WHERE m.conversation_id = $1
		 ORDER BY m.created_at ASC, m.message_id ASC
		 LIMIT $2 OFFSET $3`,
    [conversation.conversation_id, safeLimit, offset]
  );
  if (result.rowCount) {
    return {
      conversation,
      page: safePage,
      limit: safeLimit,
      messages: result.rows,
    };
  }

  const fallback = await pool.query(
    `SELECT
			m.*,
			su.first_name AS sender_first_name,
			su.last_name AS sender_last_name,
			ru.first_name AS receiver_first_name,
			ru.last_name AS receiver_last_name
		 FROM messages m
		 JOIN users su ON su.user_id = m.sender_user_id
		 JOIN users ru ON ru.user_id = m.receiver_user_id
		 WHERE (
			(m.sender_user_id = $1 AND m.receiver_user_id = $2)
			OR (m.sender_user_id = $2 AND m.receiver_user_id = $1)
		 )
		 ORDER BY m.created_at ASC, m.message_id ASC
		 LIMIT $3 OFFSET $4`,
    [conversation.user1_id, conversation.user2_id, safeLimit, offset]
  );
  return {
    conversation,
    page: safePage,
    limit: safeLimit,
    messages: fallback.rows,
  };
}

async function sendMessage({
  conversationId,
  senderId,
  receiverId,
  message,
  messageType = "text",
  attachment = null,
}) {
  const conversation = await assertConversationAccess(conversationId, senderId);
  const sender = normalizeUserId(senderId);
  const receiver = normalizeUserId(receiverId);
  if (!sender || !receiver) {
    throw new Error("Invalid sender or receiver");
  }
  if (sender !== conversation.user1_id && sender !== conversation.user2_id) {
    throw new Error("Sender is not part of the conversation");
  }
  if (receiver !== conversation.user1_id && receiver !== conversation.user2_id) {
    throw new Error("Receiver is not part of the conversation");
  }
  if (sender === receiver) {
    throw new Error("Sender and receiver cannot be the same user");
  }
  const attachmentPath = await resolveAttachmentPath(attachment);
  const attachmentName =
    attachment && attachment.originalname ? String(attachment.originalname) : null;
  const attachmentMime = attachment && attachment.mimetype ? String(attachment.mimetype) : null;
  const attachmentSize =
    attachment && Number.isInteger(Number(attachment.size)) ? Number(attachment.size) : null;
  const normalizedMessageType = attachmentPath
    ? normalizeMessageType(
        messageType === "text"
          ? attachmentMime && attachmentMime.startsWith("image/")
            ? "image"
            : "file"
          : messageType
      )
    : normalizeMessageType(messageType);
  const normalizedBody = String(message || "").trim();
  if (!normalizedBody && !attachmentPath) {
    throw new Error("Message text is required");
  }
  const bodyText = normalizedBody || attachmentName || "Attachment";

  const result = await pool.query(
    `INSERT INTO messages (
			conversation_id,
			sender_user_id,
			receiver_user_id,
			message_type,
			body,
			message,
			attachment_name,
			attachment_path,
			attachment_mime,
			attachment_size,
			status,
			delivered_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sent', NOW())
		RETURNING *`,
    [
      conversation.conversation_id,
      sender,
      receiver,
      normalizedMessageType,
      bodyText,
      normalizedBody || bodyText,
      attachmentName,
      attachmentPath,
      attachmentMime,
      attachmentSize,
    ]
  );

  await pool.query("UPDATE conversations SET updated_at = NOW() WHERE conversation_id = $1", [
    conversation.conversation_id,
  ]);

  const preview =
    normalizedMessageType === "text"
      ? bodyText
      : attachmentName || bodyText || `New ${normalizedMessageType} message`;
  const notification = await notificationService.createNotification({
    userId: receiver,
    notificationType: "chat_message",
    title: "New chat message",
    message: preview,
    referenceType: "conversation",
    referenceId: conversation.conversation_id,
    metadata: {
      conversation_id: conversation.conversation_id,
      message_id: result.rows[0].message_id,
    },
  });
  result.rows[0].notification = notification;

  return result.rows[0];
}

async function getMessageById(messageId) {
  const result = await pool.query("SELECT * FROM messages WHERE message_id = $1", [messageId]);
  return result.rowCount ? result.rows[0] : null;
}

async function editMessage({ messageId, userId, body, messageType, attachment = null }) {
  const existing = await getMessageById(messageId);
  if (!existing) throw new Error("Message not found");
  const uid = normalizeUserId(userId);
  if (existing.sender_user_id !== uid) throw new Error("Not authorized to edit this message");
  if (existing.deleted_at) throw new Error("Message has been deleted");

  const normalizedBody = String(body || "").trim();
  if (!normalizedBody) throw new Error("Message text is required");
  const attachmentPath = attachment ? await resolveAttachmentPath(attachment) : null;
  const attachmentName =
    attachment && attachment.originalname ? String(attachment.originalname) : null;
  const attachmentMime = attachment && attachment.mimetype ? String(attachment.mimetype) : null;
  const attachmentSize =
    attachment && Number.isInteger(Number(attachment.size)) ? Number(attachment.size) : null;
  const normalizedMessageType = attachmentPath
    ? normalizeMessageType(
        messageType === "text"
          ? attachmentMime && attachmentMime.startsWith("image/")
            ? "image"
            : "file"
          : messageType
      )
    : normalizeMessageType(messageType || existing.message_type);

  const result = await pool.query(
    `UPDATE messages
		 SET body = $1,
		     message = $2,
		     message_type = $3,
		     attachment_name = $4,
		     attachment_path = $5,
		     attachment_mime = $6,
		     attachment_size = $7,
		     edited_at = NOW(),
		     edited_by_user_id = $8
		 WHERE message_id = $9 AND sender_user_id = $8 AND deleted_at IS NULL
		 RETURNING *`,
    [
      normalizedBody,
      normalizedBody,
      normalizedMessageType,
      attachmentName,
      attachmentPath,
      attachmentMime,
      attachmentSize,
      uid,
      messageId,
    ]
  );
  if (!result.rowCount) throw new Error("Not authorized to edit this message");
  return result.rows[0];
}

async function deleteMessage({ messageId, userId }) {
  const existing = await getMessageById(messageId);
  if (!existing) throw new Error("Message not found");
  const uid = normalizeUserId(userId);
  if (existing.sender_user_id !== uid) throw new Error("Not authorized to delete this message");
  if (existing.deleted_at) return existing;
  const result = await pool.query(
    `UPDATE messages
		 SET body = '[deleted]',
		     message = NULL,
		     attachment_name = NULL,
		     attachment_path = NULL,
		     attachment_mime = NULL,
		     attachment_size = NULL,
		     deleted_at = NOW()
		 WHERE message_id = $1 AND sender_user_id = $2 AND deleted_at IS NULL
		 RETURNING *`,
    [messageId, uid]
  );
  if (!result.rowCount) throw new Error("Not authorized to delete this message");
  const attachmentPath = safeAttachmentPath(existing.attachment_path);
  if (attachmentPath) {
    // If attachment is a Cloudinary/remote URL, try to delete corresponding document by public_id
    if (
      String(attachmentPath).startsWith("http://") ||
      String(attachmentPath).startsWith("https://")
    ) {
      try {
        const doc = await require("../models/documentModel").findByUserAndContext(
          existing.sender_user_id,
          "chat",
          null
        );
        // try to find a matching document by URL
        const match = (doc || []).find((d) => (d.file_url || d.file_path) === attachmentPath);
        if (match && match.public_id) {
          await cloudinarySvc.deleteByPublicId(match.public_id, match.resource_type || "image");
        }
      } catch {}
    } else {
      try {
        if (fs.existsSync(attachmentPath)) fs.unlinkSync(attachmentPath);
      } catch {}
    }
  }
  return result.rows[0];
}

async function markConversationSeen(conversationId, userId) {
  const conversation = await assertConversationAccess(conversationId, userId);
  const uid = normalizeUserId(userId);
  await markUserLastSeen(uid);
  const result = await pool.query(
    `UPDATE messages
		 SET status = 'seen', seen_at = NOW(), is_read = true
		 WHERE conversation_id = $1 AND receiver_user_id = $2 AND COALESCE(status, 'sent') <> 'seen'
		 RETURNING *`,
    [conversation.conversation_id, uid]
  );
  return result.rowCount;
}

async function markConversationDelivered(conversationId, userId) {
  const conversation = await assertConversationAccess(conversationId, userId);
  const uid = normalizeUserId(userId);
  const result = await pool.query(
    `UPDATE messages
		 SET status = 'delivered', delivered_at = NOW()
		 WHERE conversation_id = $1 AND receiver_user_id = $2 AND COALESCE(status, 'sent') = 'sent'
		 RETURNING *`,
    [conversation.conversation_id, uid]
  );
  return result.rowCount;
}

async function getUnreadCount(userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return 0;
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt
		 FROM messages
		 WHERE receiver_user_id = $1
		   AND is_read = false`,
    [uid]
  );
  return result.rows[0] ? result.rows[0].cnt : 0;
}

module.exports = {
  normalizeUserId,
  normalizeConversationType,
  normalizeMessageType,
  getOrderedPair,
  canUsersChat,
  getConversationByParticipants,
  createConversation,
  getConversationById,
  assertConversationAccess,
  listConversationsForUser,
  getConversationMessages,
  sendMessage,
  markConversationSeen,
  markConversationDelivered,
  markUserLastSeen,
  getMessageById,
  editMessage,
  deleteMessage,
  getUnreadCount,
  getStartupIdByUserId,
  getInvestorIdByUserId,
  getMentorIdByUserId,
  getUserRoleByUserId,
  hasMentorshipRelationship,
  hasInvestmentRelationship,
  inferConversationType,
};
