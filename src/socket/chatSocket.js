const realtimeEmitter = require("../utils/realtimeEmitter");

module.exports = {
  emitMessageUnreadUpdated: (...args) => realtimeEmitter.emitMessageUnreadUpdated(...args),
  emitDashboardUpdated: (...args) => realtimeEmitter.emitDashboardUpdated(...args),
  emitActivityCreated: (...args) => realtimeEmitter.emitActivityCreated(...args),
};
