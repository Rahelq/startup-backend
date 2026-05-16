const deviceService = require("../services/deviceService");

module.exports = async function trackDevice(req, res, next) {
  try {
    if (!req.user) return next();
    const ua = req.get("user-agent") || "";
    const device = {
      device_id: req.headers["x-device-id"] || `${req.user.user_id}-${req.ip}`,
      device_name: ua.split(" ")[0],
      browser: ua,
      os: process.platform,
      ip_address: req.ip,
      location: null,
    };
    // best-effort register device asynchronously
    deviceService.registerDevice(req.user.user_id, device).catch(() => {});
  } catch (e) {
    // swallow device tracking errors
  }
  next();
};
