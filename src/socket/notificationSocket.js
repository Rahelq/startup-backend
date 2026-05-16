const realtimeEmitter = require("../utils/realtimeEmitter");

module.exports = {
  emitNotificationCreated: (...args) => realtimeEmitter.emitNotificationCreated(...args),
  emitNotificationCountUpdate: (...args) => realtimeEmitter.emitNotificationCountUpdate(...args),
  emitNotificationRead: (...args) => realtimeEmitter.emitNotificationRead(...args),
  emitDashboardUpdated: (...args) => realtimeEmitter.emitDashboardUpdated(...args),
};
