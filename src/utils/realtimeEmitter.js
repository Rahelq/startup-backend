// ============================================
// REAL-TIME EVENTS EMITTER UTILITY
// Centralizes all Socket.io event emissions
// for Messages, Notifications, Video Sessions
// ============================================

let io = null;

function emitToUsers(userIds, eventName, payload) {
  if (!io) return;
  const recipients = Array.isArray(userIds) ? userIds : [userIds];
  recipients.filter(Boolean).forEach((userId) => {
    io.to(`user:${Number(userId)}`).emit(eventName, payload);
  });
}

// Initialize with Socket.io instance
function init(socketIoInstance) {
  io = socketIoInstance;
}

// ============================================
// CHAT MESSAGE EVENTS
// ============================================

/**
 * Emit when a message is sent
 * Sends to receiver and both participants in the pair
 */
function emitMessageSent(senderUserId, receiverUserId, messageData) {
  if (!io) return;

  // Send to specific receiver
  io.to(`user:${receiverUserId}`).emit("message:new", {
    sender_id: senderUserId,
    receiver_id: receiverUserId,
    message_id: messageData.message_id,
    message: messageData.message,
    message_type: messageData.message_type,
    conversation_id: messageData.conversation_id,
    created_at: messageData.created_at,
    timestamp: new Date().toISOString(),
  });

  // Also emit to pair room if joined
  const pairRoom = getPairRoom(senderUserId, receiverUserId);
  if (pairRoom) {
    io.to(pairRoom).emit("message:new", {
      sender_id: senderUserId,
      receiver_id: receiverUserId,
      message_id: messageData.message_id,
      message: messageData.message,
      message_type: messageData.message_type,
      conversation_id: messageData.conversation_id,
      created_at: messageData.created_at,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Emit when message is marked as read
 */
function emitMessageRead(messageId, readByUserId, conversationId) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit("message:read", {
    message_id: messageId,
    read_by: readByUserId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit when typing indicator starts
 */
function emitTypingStart(userId, conversationId, receiverUserId) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit("typing:start", {
    user_id: userId,
    conversation_id: conversationId,
    timestamp: new Date().toISOString(),
  });

  if (receiverUserId) {
    io.to(`user:${receiverUserId}`).emit("typing:start", {
      user_id: userId,
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Emit when typing stops
 */
function emitTypingStop(userId, conversationId, receiverUserId) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit("typing:stop", {
    user_id: userId,
    conversation_id: conversationId,
    timestamp: new Date().toISOString(),
  });

  if (receiverUserId) {
    io.to(`user:${receiverUserId}`).emit("typing:stop", {
      user_id: userId,
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================
// NOTIFICATION EVENTS
// ============================================

/**
 * Emit when notification is created
 * Used for: investment offers, mentorship requests, session bookings, etc.
 */
function emitNotificationCreated(userId, notificationData) {
  if (!io) return;
  const payload = {
    notification_id: notificationData.notification_id,
    user_id: userId,
    notification_type: notificationData.notification_type,
    title: notificationData.title,
    message: notificationData.message,
    reference_type: notificationData.reference_type,
    reference_id: notificationData.reference_id,
    created_at: notificationData.created_at,
    timestamp: new Date().toISOString(),
  };

  io.to(`user:${userId}`).emit("notification:new", payload);
  io.to(`user:${userId}`).emit("notification_created", payload);
  io.to(`user:${userId}`).emit("dashboard_updated", {
    type: "notification",
    notification: payload,
  });
}

/**
 * Emit unread notification count update
 */
function emitNotificationCountUpdate(userId, unreadCount) {
  if (!io) return;
  const payload = {
    user_id: userId,
    unread_count: unreadCount,
    timestamp: new Date().toISOString(),
  };

  io.to(`user:${userId}`).emit("notification:count", payload);
  io.to(`user:${userId}`).emit("notification_count_updated", payload);
}

/**
 * Emit when notification is marked as read
 */
function emitNotificationRead(userId, notificationId) {
  if (!io) return;
  const payload = {
    notification_id: notificationId,
    user_id: userId,
    timestamp: new Date().toISOString(),
  };

  io.to(`user:${userId}`).emit("notification:read", payload);
  io.to(`user:${userId}`).emit("notification_read", payload);
}

function emitDashboardUpdated(userIds, payload) {
  if (!io) return;
  emitToUsers(userIds, "dashboard_updated", {
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

function emitActivityCreated(userIds, activityData) {
  if (!io) return;
  const payload = { activity: activityData, timestamp: new Date().toISOString() };
  emitToUsers(userIds, "activity_created", payload);
  emitToUsers(userIds, "dashboard_updated", { type: "activity", ...payload });
}

function emitMessageUnreadUpdated(userIds, unreadCount) {
  if (!io) return;
  const payload = { unread_count: unreadCount, timestamp: new Date().toISOString() };
  emitToUsers(userIds, "message_unread_updated", payload);
  emitToUsers(userIds, "dashboard_updated", { type: "messages", ...payload });
}

function emitSessionUpdated(userIds, sessionData) {
  if (!io) return;
  const payload = { session: sessionData, timestamp: new Date().toISOString() };
  emitToUsers(userIds, "session_updated", payload);
  emitToUsers(userIds, "dashboard_updated", { type: "session", ...payload });
}

/**
 * Emit bulk notification event (for admin broadcasts)
 */
function emitBroadcastNotification(userIds, notificationData) {
  if (!io) return;

  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("notification:broadcast", {
      notification_type: notificationData.notification_type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || "normal",
      timestamp: new Date().toISOString(),
    });
  });
}

// ============================================
// PAYMENT EVENTS
// ============================================

/**
 * Emit when a payment checkout is created
 */
function emitPaymentInitiated(userId, paymentData) {
  if (!io) return;
  const payload = {
    payment_id: paymentData.payment_id,
    reference_type: paymentData.reference_type,
    reference_id: paymentData.reference_id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_method: paymentData.payment_method,
    status: paymentData.status,
    checkout_url: paymentData.checkout_url,
    tx_ref: paymentData.tx_ref,
    timestamp: new Date().toISOString(),
  };

  io.to(`user:${userId}`).emit("payment:initiated", payload);
  io.to(`user:${userId}`).emit("payment_updated", payload);
  io.to(`user:${userId}`).emit("dashboard_updated", { type: "payment", payment: payload });
}

/**
 * Emit when a payment is confirmed
 */
function emitPaymentCompleted(userIds, paymentData) {
  if (!io) return;

  const recipients = Array.isArray(userIds) ? userIds : [userIds];
  recipients.forEach((userId) => {
    const payload = {
      payment_id: paymentData.payment_id,
      reference_type: paymentData.reference_type,
      reference_id: paymentData.reference_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.payment_method,
      status: paymentData.status,
      tx_ref: paymentData.tx_ref,
      verified_at: paymentData.verified_at,
      timestamp: new Date().toISOString(),
    };
    io.to(`user:${userId}`).emit("payment:completed", payload);
    io.to(`user:${userId}`).emit("payment_updated", payload);
    io.to(`user:${userId}`).emit("dashboard_updated", { type: "payment", payment: payload });
  });
}

/**
 * Emit when a payment fails
 */
function emitPaymentFailed(userId, paymentData) {
  if (!io) return;
  const payload = {
    payment_id: paymentData.payment_id,
    reference_type: paymentData.reference_type,
    reference_id: paymentData.reference_id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_method: paymentData.payment_method,
    status: paymentData.status || "failed",
    tx_ref: paymentData.tx_ref,
    error: paymentData.error || null,
    timestamp: new Date().toISOString(),
  };

  io.to(`user:${userId}`).emit("payment:failed", payload);
  io.to(`user:${userId}`).emit("payment_updated", payload);
  io.to(`user:${userId}`).emit("dashboard_updated", { type: "payment", payment: payload });
}

// ============================================
// WORKFLOW STATE CHANGE EVENTS
// ============================================

/**
 * Emit when investment offer status changes
 */
function emitInvestmentStatusChanged(investmentId, newStatus, involvedUsers) {
  if (!io) return;

  involvedUsers.forEach((userId) => {
    io.to(`user:${userId}`).emit("investment:status-changed", {
      investment_id: investmentId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Emit when mentorship session is booked
 */
function emitSessionBooked(sessionId, mentorUserId, startupUserId, sessionData) {
  if (!io) return;
  const recipients = [mentorUserId, startupUserId];
  const mentorPayload = {
    mentorship_session_id: sessionId,
    session_date: sessionData.session_date,
    session_start_at: sessionData.session_start_at,
    session_end_at: sessionData.session_end_at,
    status: sessionData.status,
    timestamp: new Date().toISOString(),
  };
  const startupPayload = {
    mentorship_session_id: sessionId,
    session_date: sessionData.session_date,
    session_start_at: sessionData.session_start_at,
    status: sessionData.status,
    timestamp: new Date().toISOString(),
  };

  io.to(`user:${mentorUserId}`).emit("session:booked", mentorPayload);
  io.to(`user:${startupUserId}`).emit("session:confirmed", startupPayload);
  emitSessionUpdated(recipients, sessionData);
}

/**
 * Emit when milestone status changes
 */
function emitMilestoneUpdated(projectId, milestoneId, newStatus, investorUserIds) {
  if (!io) return;

  investorUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("milestone:updated", {
      project_id: projectId,
      milestone_id: milestoneId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });
  });
}

// ============================================
// VIDEO SESSION EVENTS
// ============================================

/**
 * Emit when video session starts
 */
function emitVideoSessionStarted(sessionId, participantUserIds, meetingUrl) {
  if (!io) return;

  participantUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("video:session-started", {
      video_session_id: sessionId,
      meeting_url: meetingUrl,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Emit when participant joins video session
 */
function emitVideoParticipantJoined(sessionId, joiningUserId, otherUserIds) {
  if (!io) return;

  const room = `video:${sessionId}`;

  // Notify others in the session
  io.to(room).emit("video:participant-joined", {
    video_session_id: sessionId,
    participant_user_id: joiningUserId,
    timestamp: new Date().toISOString(),
  });

  // Also direct notify through user rooms
  otherUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("video:participant-joined", {
      video_session_id: sessionId,
      participant_user_id: joiningUserId,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Emit when participant leaves video session
 */
function emitVideoParticipantLeft(sessionId, leavingUserId, otherUserIds) {
  if (!io) return;

  const room = `video:${sessionId}`;

  // Notify others in the session
  io.to(room).emit("video:participant-left", {
    video_session_id: sessionId,
    participant_user_id: leavingUserId,
    timestamp: new Date().toISOString(),
  });

  // Also direct notify through user rooms
  otherUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("video:participant-left", {
      video_session_id: sessionId,
      participant_user_id: leavingUserId,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Emit when video session ends
 */
function emitVideoSessionEnded(sessionId, participantUserIds, duration) {
  if (!io) return;

  participantUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("video:session-ended", {
      video_session_id: sessionId,
      duration_minutes: duration,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Emit video session reschedule
 */
function emitVideoSessionRescheduled(sessionId, newDateTime, participantUserIds) {
  if (!io) return;

  participantUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("video:session-rescheduled", {
      video_session_id: sessionId,
      new_scheduled_at: newDateTime,
      timestamp: new Date().toISOString(),
    });
  });
}

// ============================================
// PRESENCE & CONNECTION EVENTS
// ============================================

/**
 * Emit when user comes online
 */
function emitUserOnline(userId, contactUserIds) {
  if (!io) return;

  contactUserIds.forEach((contactId) => {
    io.to(`user:${contactId}`).emit("user:online", {
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Emit when user goes offline
 */
function emitUserOffline(userId, contactUserIds) {
  if (!io) return;

  contactUserIds.forEach((contactId) => {
    io.to(`user:${contactId}`).emit("user:offline", {
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPairRoom(userId1, userId2) {
  const a = Number(userId1);
  const b = Number(userId2);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return a < b ? `pair:${a}:${b}` : `pair:${b}:${a}`;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  init,

  // Chat events
  emitMessageSent,
  emitMessageRead,
  emitTypingStart,
  emitTypingStop,

  // Notification events
  emitNotificationCreated,
  emitNotificationCountUpdate,
  emitNotificationRead,
  emitBroadcastNotification,
  emitDashboardUpdated,
  emitActivityCreated,
  emitMessageUnreadUpdated,
  emitSessionUpdated,

  // Payment events
  emitPaymentInitiated,
  emitPaymentCompleted,
  emitPaymentFailed,

  // Workflow state changes
  emitInvestmentStatusChanged,
  emitSessionBooked,
  emitMilestoneUpdated,

  // Video session events
  emitVideoSessionStarted,
  emitVideoParticipantJoined,
  emitVideoParticipantLeft,
  emitVideoSessionEnded,
  emitVideoSessionRescheduled,

  // Presence events
  emitUserOnline,
  emitUserOffline,
};
