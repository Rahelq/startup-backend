const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const pool = require("../config/db");

// 🔐 Authenticate user (check token)
exports.authenticate = (req, res, next) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"] || req.headers["x-access-token"];

  if (!authHeader) {
    return res.status(401).send("Access denied. No token.");
  }

  let token = authHeader.replace(/^Bearer\s+/i, "").trim();
  token = token
    .replace(/^"(.+)"$/, "$1")
    .replace(/^'(.+)'$/, "$1")
    .trim();

  if (!token) {
    return res.status(401).send("Access denied. No token.");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // contains user_id + role
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
};

// 🔒 Authorize roles (THIS is the one you asked about)
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const allowed = roles.map((r) => String(r).toLowerCase());
    const current = String(req.user.role || "").toLowerCase();
    if (!allowed.includes(current)) {
      return res.status(403).send("Access denied");
    }
    next();
  };
};

// Ensure the user has been approved by admin (platform verification)
exports.requireApproval = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const r = await pool.query(
      `SELECT is_approved, is_active, verification_status, account_status, deleted_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const u = r.rows[0];
    if (u.deleted_at) return res.status(403).json({ message: "Account removed" });
    if (u.account_status === "suspended" || u.is_active === false) {
      return res.status(403).json({ message: "Account disabled" });
    }
    const verified =
      u.verification_status === "approved" ||
      (u.verification_status == null && u.is_approved === true);
    if (!verified) {
      return res.status(403).json({
        message: "Account pending verification",
        verification_status: u.verification_status || (u.is_approved ? "approved" : "pending"),
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Backwards-compatible alias used across the codebase
exports.requireAuth = exports.authenticate;
