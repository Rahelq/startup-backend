const pool = require("../config/db");

module.exports = async function require2FA(req, res, next) {
  try {
    const userId = req.user && req.user.user_id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const r = await pool.query("SELECT is_enabled FROM two_factor_auth WHERE user_id = $1", [
      userId,
    ]);
    if (r.rows.length && r.rows[0].is_enabled) return next();
    return res.status(403).json({ message: "2FA required" });
  } catch (err) {
    next(err);
  }
};
