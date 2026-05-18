const deviceService = require("../services/deviceService");

async function listDevices(req, res, next) {
  try {
    const userId = req.user.user_id;
    const devices = await deviceService.listDevices(userId);
    res.json({ data: devices });
  } catch (err) {
    next(err);
  }
}

async function removeDevice(req, res, next) {
  try {
    const userId = req.user.user_id;
    const id = req.params.id;
    const removed = await deviceService.removeDevice(userId, id);
    res.json({ data: removed });
  } catch (err) {
    next(err);
  }
}

async function trustDevice(req, res, next) {
  try {
    const userId = req.user.user_id;
    const id = req.params.id;
    const { is_trusted } = req.body || {};
    const updated = await deviceService.trustDevice(userId, id, !!is_trusted);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDevices, removeDevice, trustDevice };
