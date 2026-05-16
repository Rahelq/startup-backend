const pool = require("../config/db");

module.exports = async function requireTrustedDevice(req, res, next) {
  try {
    const userId = req.user && req.user.user_id;
    const deviceId = req.headers["x-device-id"];
    if (!userId || !deviceId) return res.status(403).json({ message: "Trusted device required" });
    const r = await pool.query(
      "SELECT is_trusted FROM user_devices WHERE user_id = $1 AND device_id = $2",
      [userId, deviceId]
    );
    if (r.rows.length && r.rows[0].is_trusted) return next();
    return res.status(403).json({ message: "Untrusted device" });
  } catch (err) {
    next(err);
  }
};
