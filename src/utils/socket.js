const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const IORedis = require("ioredis");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const chatService = require("../services/chatService");
const realtimeEmitter = require("../utils/realtimeEmitter");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

let io;
let pubClient = null;
let subClient = null;
let presenceMap = new Map();
let unreadCountMap = new Map();

function unreadKey(userId) {
  return `unread:${Number(userId)}`;
}

async function initUnreadCount(userId) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return 0;
  if (pubClient) {
    const value = await pubClient.get(unreadKey(uid));
    if (value !== null) return Number(value) || 0;
  }
  const result = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM messages WHERE receiver_user_id = $1 AND is_read = false",
    [uid]
  );
  const count = result.rows[0] ? result.rows[0].cnt : 0;
  if (pubClient) await pubClient.set(unreadKey(uid), String(count));
  else unreadCountMap.set(uid, count);
  return count;
}

async function getUnreadCount(userId) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return 0;
  return chatService.getUnreadCount(uid);
}

async function incrementUnreadCount(userId) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return 0;
  if (pubClient) return Number(await pubClient.incr(unreadKey(uid)));
  const nextValue = (unreadCountMap.get(uid) || 0) + 1;
  unreadCountMap.set(uid, nextValue);
  return nextValue;
}

async function decrementUnreadCount(userId) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return 0;
  if (pubClient) {
    const current = Number((await pubClient.get(unreadKey(uid))) || 0);
    const nextValue = current > 0 ? current - 1 : 0;
    await pubClient.set(unreadKey(uid), String(nextValue));
    return nextValue;
  }
  const current = unreadCountMap.get(uid) || 0;
  const nextValue = current > 0 ? current - 1 : 0;
  unreadCountMap.set(uid, nextValue);
  return nextValue;
}

async function emitUnreadCount(userId) {
  if (!io) return 0;
  const count = await getUnreadCount(userId);
  io.to(`user:${Number(userId)}`).emit("unread:count", {
    user_id: Number(userId),
    count,
  });
  realtimeEmitter.emitMessageUnreadUpdated(Number(userId), count);
  return count;
}

async function clearPresence(userId) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return;
  if (presenceMap) {
    presenceMap.delete(uid);
    return;
  }
  if (pubClient) {
    await pubClient.del(`presence:${uid}`);
  }
}

function getPairRoom(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return x < y ? `pair:${x}:${y}` : `pair:${y}:${x}`;
}

function getConversationRoom(conversationId) {
  const id = Number(conversationId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return `conversation:${id}`;
}

async function verifyMentorshipPair(userId, otherUserId) {
  // check if a mentorship_requests row exists between startup and mentor users
  const r = await pool.query(
    `SELECT mr.* FROM mentorship_requests mr
     JOIN startups s ON s.startup_id = mr.startup_id
     JOIN mentors m ON m.mentor_id = mr.mentor_id
     WHERE (s.user_id = $1 AND m.user_id = $2) OR (s.user_id = $2 AND m.user_id = $1)
     LIMIT 1`,
    [userId, otherUserId]
  );
  return r.rowCount > 0;
}

async function verifyInvestmentPair(userId, otherUserId) {
  // check if there is an investment_requests row linking users via startup/investor
  const r = await pool.query(
    `SELECT ir.* FROM investment_requests ir
     JOIN startups s ON s.startup_id = ir.startup_id
     JOIN investors iv ON iv.investor_id = ir.investor_id
     WHERE (s.user_id = $1 AND iv.user_id = $2) OR (s.user_id = $2 AND iv.user_id = $1)
     LIMIT 1`,
    [userId, otherUserId]
  );
  return r.rowCount > 0;
}

function init(server) {
  const corsOrigin = process.env.SOCKET_CORS_ORIGIN || true;
  io = new Server(server, { cors: { origin: corsOrigin } });

  const REDIS_URL = process.env.REDIS_URL;
  if (REDIS_URL) {
    pubClient = new IORedis(REDIS_URL);
    subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    // use Redis for presence storage via pubClient
    presenceMap = null;
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: missing token"));
    try {
      const decoded = jwt.verify(token.replace(/^Bearer\s+/i, ""), JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch {
      return next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.user && socket.user.user_id;
    if (uid) {
      // join personal room
      socket.join(`user:${uid}`);
      // mark presence
      try {
        if (presenceMap) {
          presenceMap.set(uid, Date.now());
        } else if (pubClient) {
          pubClient.set(`presence:${uid}`, "online");
          pubClient.expire(`presence:${uid}`, 60 * 60 * 24);
        }
        Promise.resolve(initUnreadCount(uid)).catch((e) => {
          console.error("unread init failed", e.message || e);
        });
      } catch (e) {
        console.error("presence set failed", e.message || e);
      }
    }

    socket.on("joinPair", async (data, cb) => {
      // data: { otherUserId, type }
      try {
        const other = Number(data.otherUserId);
        if (!other) return cb && cb({ error: "Invalid otherUserId" });
        const type = data.type || "mentorship";
        let ok = false;
        if (type === "mentorship") ok = await verifyMentorshipPair(uid, other);
        else if (type === "investment") ok = await verifyInvestmentPair(uid, other);
        else ok = true; // allow other room types after validation

        if (!ok) return cb && cb({ error: "Not authorized to join this pair" });

        const room = getPairRoom(uid, other);
        socket.join(room);

        // emit presence init for both participants
        try {
          let aOnline = false;
          let bOnline = false;
          if (presenceMap) {
            aOnline = presenceMap.has(uid);
            bOnline = presenceMap.has(other);
          } else if (pubClient) {
            aOnline = !!(await pubClient.get(`presence:${uid}`));
            bOnline = !!(await pubClient.get(`presence:${other}`));
          }
          if (io)
            io.to(room).emit("presence:init", {
              users: [
                { user_id: uid, online: !!aOnline },
                { user_id: other, online: !!bOnline },
              ],
            });
          await emitUnreadCount(uid);
          await emitUnreadCount(other);
        } catch (e) {
          console.error("presence init failed", e.message || e);
        }

        return cb && cb({ ok: true, room });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("joinConversation", async (data, cb) => {
      try {
        const conversationId = Number(data && data.conversationId);
        if (!Number.isInteger(conversationId) || conversationId <= 0) {
          return cb && cb({ error: "Invalid conversationId" });
        }
        const conversation = await chatService.assertConversationAccess(conversationId, uid);
        const room = getConversationRoom(conversationId);
        socket.join(room);
        socket.join(getPairRoom(conversation.user1_id, conversation.user2_id));
        await chatService.markConversationDelivered(conversationId, uid);
        await chatService.markUserLastSeen(uid);
        await emitUnreadCount(uid);
        return cb && cb({ ok: true, room, conversation });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("sendMessage", async (data, cb) => {
      // data: { otherUserId, subject, body }
      try {
        const receiver = Number(data.otherUserId);
        if (!Number.isInteger(receiver) || receiver <= 0) {
          return cb && cb({ error: "Invalid otherUserId" });
        }
        const body = (data.body || "").trim();
        if (!body) return cb && cb({ error: "Body required" });

        let conversation = await chatService.getConversationByParticipants(
          uid,
          receiver,
          data.conversationType || data.type || undefined
        );
        if (!conversation) {
          conversation = await chatService.createConversation(
            uid,
            receiver,
            data.conversationType || data.type || undefined
          );
        }

        const msg = await chatService.sendMessage({
          conversationId: conversation.conversation_id,
          senderId: uid,
          receiverId: receiver,
          message: body,
          messageType: data.messageType || data.message_type || "text",
        });

        const pairRoom = getPairRoom(uid, receiver);
        const conversationRoom = getConversationRoom(conversation.conversation_id);
        await emitUnreadCount(receiver);
        if (io) {
          io.to(pairRoom).emit("message:new", msg);
          io.to(conversationRoom).emit("receive_message", msg);
          io.to(conversationRoom).emit("message:new", msg);
          io.to(`user:${receiver}`).emit("message:new", msg);
          if (msg.notification) {
            io.to(`user:${receiver}`).emit("notification:new", msg.notification);
          }
          const receiverOnline =
            (presenceMap && presenceMap.has(receiver)) ||
            (pubClient && (await pubClient.get(`presence:${receiver}`)));
          if (receiverOnline) {
            await chatService.markConversationDelivered(conversation.conversation_id, receiver);
            io.to(conversationRoom).emit("message:delivered", {
              conversationId: conversation.conversation_id,
              userId: receiver,
            });
          }
        }

        return cb && cb({ ok: true, message: msg, conversation });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("send_message", async (data, cb) => {
      try {
        const conversationId = Number(data && data.conversationId);
        const receiverId = Number(data && data.receiverId);
        const messageText = data && (data.message || data.body);
        if (!Number.isInteger(conversationId) || conversationId <= 0) {
          return cb && cb({ error: "Invalid conversationId" });
        }
        if (!Number.isInteger(receiverId) || receiverId <= 0) {
          return cb && cb({ error: "Invalid receiverId" });
        }
        const msg = await chatService.sendMessage({
          conversationId,
          senderId: uid,
          receiverId,
          message: messageText,
          messageType: data.messageType || data.message_type || "text",
        });
        const room = getConversationRoom(conversationId);
        await emitUnreadCount(receiverId);
        if (io) {
          io.to(room).emit("receive_message", msg);
          io.to(room).emit("message:new", msg);
          io.to(`user:${receiverId}`).emit("message:new", msg);
          if (msg.notification) {
            io.to(`user:${receiverId}`).emit("notification:new", msg.notification);
          }
          const receiverOnline =
            (presenceMap && presenceMap.has(receiverId)) ||
            (pubClient && (await pubClient.get(`presence:${receiverId}`)));
          if (receiverOnline) {
            await chatService.markConversationDelivered(conversationId, receiverId);
            io.to(room).emit("message:delivered", {
              conversationId,
              userId: receiverId,
            });
          }
        }
        return cb && cb({ ok: true, message: msg });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("typing", (data) => {
      // data: { otherUserId, typing: true|false }
      try {
        const other = Number(data.otherUserId);
        if (!other) return;
        const room = getPairRoom(uid, other);
        if (room && io) {
          io.to(room).emit("typing", {
            from: uid,
            to: other,
            typing: !!data.typing,
          });
          const conversationRoom = getConversationRoom(data && data.conversationId);
          if (conversationRoom) {
            io.to(conversationRoom).emit("typing", {
              from: uid,
              to: other,
              typing: !!data.typing,
            });
          }
        }
      } catch (e) {
        console.error("typing handler error", e.message || e);
      }
    });

    socket.on("stop_typing", (data) => {
      try {
        const room = getConversationRoom(data && data.conversationId);
        if (room && io) {
          io.to(room).emit("stop_typing", { from: uid });
        }
      } catch (e) {
        console.error("stop_typing handler error", e.message || e);
      }
    });

    socket.on("message:edit", async (data, cb) => {
      try {
        const messageId = Number(data && data.messageId);
        if (!Number.isInteger(messageId) || messageId <= 0) {
          return cb && cb({ error: "Invalid messageId" });
        }
        const edited = await chatService.editMessage({
          messageId,
          userId: uid,
          body: data && (data.message || data.body),
          messageType: data && (data.messageType || data.message_type),
        });
        const room = getConversationRoom(edited.conversation_id);
        if (io && room) {
          io.to(room).emit("message:edited", { message: edited });
        }
        return cb && cb({ ok: true, message: edited });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("message:delete", async (data, cb) => {
      try {
        const messageId = Number(data && data.messageId);
        if (!Number.isInteger(messageId) || messageId <= 0) {
          return cb && cb({ error: "Invalid messageId" });
        }
        const deleted = await chatService.deleteMessage({
          messageId,
          userId: uid,
        });
        const room = getConversationRoom(deleted.conversation_id);
        if (io && room) {
          io.to(room).emit("message:deleted", { message: deleted });
        }
        return cb && cb({ ok: true, message: deleted });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("message:read", async (data, cb) => {
      // data: { messageId }
      try {
        const messageId = Number(data.messageId);
        if (!Number.isInteger(messageId) || messageId <= 0)
          return cb && cb({ error: "Invalid messageId" });
        // mark as read if this socket user is the receiver
        const up = await pool.query(
          "UPDATE messages SET is_read = true, status = 'seen', seen_at = NOW() WHERE message_id = $1 AND receiver_user_id = $2 RETURNING *",
          [messageId, uid]
        );
        if (!up.rowCount) return cb && cb({ error: "Message not found or not authorized" });
        const msg = up.rows[0];
        const other = msg.sender_user_id;
        const room = getPairRoom(uid, other);
        await emitUnreadCount(uid);
        if (io && room) {
          io.to(room).emit("message:read", { messageId, by: uid });
        }
        if (io) {
          io.to(`user:${other}`).emit("message:read", { messageId, by: uid });
        }
        return cb && cb({ ok: true });
      } catch (e) {
        console.error("message:read handler error", e.message || e);
        return cb && cb({ error: e.message });
      }
    });

    socket.on("message_seen", async (data, cb) => {
      try {
        const conversationId = Number(data && data.conversationId);
        if (!Number.isInteger(conversationId) || conversationId <= 0) {
          return cb && cb({ error: "Invalid conversationId" });
        }
        await chatService.markConversationSeen(conversationId, uid);
        await emitUnreadCount(uid);
        const room = getConversationRoom(conversationId);
        if (io && room) {
          io.to(room).emit("message_seen", { userId: uid });
        }
        return cb && cb({ ok: true });
      } catch (err) {
        return cb && cb({ error: err.message });
      }
    });

    socket.on("disconnect", async () => {
      try {
        await chatService.markUserLastSeen(uid);
        await clearPresence(uid);
      } catch (e) {
        console.error("presence clear failed", e.message || e);
      }
    });
  });
}

function getIO() {
  return io;
}

module.exports = {
  init,
  getIO,
  getPairRoom,
  getUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
  emitUnreadCount,
  clearPresence,
};
