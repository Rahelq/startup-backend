const chatService = require("../services/chatService");
const realtimeEmitter = require("../utils/realtimeEmitter");
const upload = require("../middleware/multerMemory");

// exported helper middleware (kept for legacy callers)
exports.uploadMessageFile = upload.single("file");

function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit };
}

exports.sendMessage = async (req, res) => {
  try {
    const { user_id: authUserId } = req.user;
    const { conversation_id, receiver_id, message, message_type, subject, conversation_type } =
      req.body || {};

    const receiverId = Number(receiver_id);
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      return res.status(400).json({ error: "receiver_id is required" });
    }

    let conversationId = Number(conversation_id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      const conversation = await chatService.createConversation(
        authUserId,
        receiverId,
        conversation_type || undefined
      );
      conversationId = conversation.conversation_id;
    }

    const sentMessage = await chatService.sendMessage({
      conversationId,
      senderId: authUserId,
      receiverId,
      message: message || subject,
      messageType:
        message_type ||
        (req.file && req.file.mimetype && req.file.mimetype.startsWith("image/")
          ? "image"
          : req.file
            ? "file"
            : "text"),
      attachment: req.file || null,
    });

    // Emit real-time message event
    realtimeEmitter.emitMessageSent(authUserId, receiverId, sentMessage);

    return res.status(201).json({ message: sentMessage });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { user_id: authUserId } = req.user;
    const conversationId = Number(req.params.conversationId);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const { page, limit } = parsePagination(req.query);
    const payload = await chatService.getConversationMessages(
      conversationId,
      authUserId,
      page,
      limit
    );
    return res.status(200).json(payload);
  } catch (err) {
    const status =
      err.message === "Conversation not found"
        ? 404
        : err.message === "Not authorized for this conversation"
          ? 403
          : 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.markSeen = async (req, res) => {
  try {
    const { user_id: authUserId } = req.user;
    const conversationId = Number(req.params.conversationId);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const seenCount = await chatService.markConversationSeen(conversationId, authUserId);

    // Emit real-time message read event
    realtimeEmitter.emitMessageRead(null, authUserId, conversationId);

    return res.status(200).json({ message: "Messages marked as seen", seen_count: seenCount });
  } catch (err) {
    const status =
      err.message === "Conversation not found"
        ? 404
        : err.message === "Not authorized for this conversation"
          ? 403
          : 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const { user_id: authUserId } = req.user;
    const unreadCount = await chatService.getUnreadCount(authUserId);
    return res.status(200).json({ user_id: authUserId, unread_count: unreadCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { user_id: authUserId } = req.user;
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ error: "Invalid message id" });
    }
    const editedMessage = await chatService.editMessage({
      messageId,
      userId: authUserId,
      body: req.body && (req.body.message || req.body.body),
      messageType: req.body && (req.body.message_type || req.body.messageType),
      attachment: req.file || null,
    });

    // Emit real-time message edited event
    realtimeEmitter.emitMessageSent(
      authUserId,
      editedMessage.receiver_user_id || editedMessage.sender_user_id,
      {
        ...editedMessage,
        edited: true,
      }
    );

    return res.status(200).json({ message: editedMessage });
  } catch (err) {
    const status =
      err.message === "Message not found"
        ? 404
        : err.message === "Not authorized to edit this message"
          ? 403
          : 400;
    return res.status(status).json({ error: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { user_id: authUserId } = req.user;
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ error: "Invalid message id" });
    }
    const deletedMessage = await chatService.deleteMessage({
      messageId,
      userId: authUserId,
    });

    // Emit real-time message deleted event
    realtimeEmitter.emitMessageSent(
      authUserId,
      deletedMessage.receiver_user_id || deletedMessage.sender_user_id,
      {
        ...deletedMessage,
        deleted: true,
      }
    );

    return res.status(200).json({ message: deletedMessage });
  } catch (err) {
    const status =
      err.message === "Message not found"
        ? 404
        : err.message === "Not authorized to delete this message"
          ? 403
          : 400;
    return res.status(status).json({ error: err.message });
  }
};
