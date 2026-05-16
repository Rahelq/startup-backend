const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const userModel = require("../models/userModel");
const mail = require("../utils/mail");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const REFRESH_TOKEN_EXP_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || "30", 10);
const pool = require("../config/db");

function assertNotAdminSelfRegistration(role) {
  const r = (role || "").trim();
  if (r === "Admin") {
    const err = new Error(
      "Admin accounts cannot be registered via the API. Create admins in the database or seed script."
    );
    err.status = 403;
    throw err;
  }
}

function accountBlocked(user) {
  if (!user) return true;
  if (user.deleted_at) return true;
  if (user.account_status === "deleted") return true;
  if (user.account_status === "suspended" || user.is_active === false) return true;
  return false;
}

async function registerUser({ firstName, lastName, email, password, role = "Startup" }) {
  assertNotAdminSelfRegistration(role);
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) throw { status: 409, message: "User already exists" };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.createUser({
    firstName,
    lastName,
    email,
    passwordHash: hashedPassword,
    role,
  });

  const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    "INSERT INTO refresh_tokens (token, user_id, expires_at, revoked) VALUES ($1, $2, $3, false)",
    [refreshToken, user.user_id, expiresAt]
  );

  return { user, token, refreshToken };
}

const suspiciousService = require("./suspiciousService");
const deviceService = require("./deviceService");
const sessionService = require("./sessionService");

async function loginUser({ email, password, ip = null, device = {} }) {
  const user = await userModel.findByEmail(email);
  if (!user) throw { status: 404, message: "User not found" };

  const isMatch = await bcrypt.compare(password, user.password_hash);
  await suspiciousService.recordLoginAttempt({
    userId: user.user_id,
    email,
    ip,
    deviceInfo: device,
    success: !!isMatch,
    failureReason: isMatch ? null : "invalid_password",
  });
  if (!isMatch) throw { status: 401, message: "Invalid password" };
  if (accountBlocked(user)) throw { status: 403, message: "Account disabled" };

  const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    "INSERT INTO refresh_tokens (token, user_id, expires_at, revoked) VALUES ($1, $2, $3, false)",
    [refreshToken, user.user_id, expiresAt]
  );

  // register device asynchronously
  try {
    if (device && device.device_id) await deviceService.registerDevice(user.user_id, device);
  } catch (e) {}

  // create session record
  try {
    await sessionService.createSession({
      userId: user.user_id,
      deviceId: device.device_id,
      ip,
      location: device.location,
      expiresAt,
      refreshToken,
    });
  } catch (e) {}

  // suspicious assessment
  try {
    const { suspicious } = await suspiciousService.assessSuspicion({
      userId: user.user_id,
      ip,
      deviceId: device.device_id,
    });
    if (suspicious) {
      // note: notification & security log emitted by assessSuspicion
    }
  } catch (e) {}

  return { user, token, refreshToken };
}

async function refreshAccessToken(refreshToken) {
  const row = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [refreshToken]);
  if (row.rows.length === 0) throw { status: 401, message: "Invalid refresh token" };

  const token = row.rows[0];
  if (token.revoked) throw { status: 401, message: "Refresh token revoked" };
  if (new Date(token.expires_at) < new Date())
    throw { status: 401, message: "Refresh token expired" };

  const user = await userModel.findById(token.user_id);
  if (!user) throw { status: 404, message: "User not found" };
  if (accountBlocked(user)) throw { status: 403, message: "Account disabled" };

  const newAccessToken = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });
  return { token: newAccessToken };
}

async function logoutUser(refreshToken) {
  await pool.query("UPDATE refresh_tokens SET revoked = true WHERE token = $1", [refreshToken]);
  return { message: "Logged out" };
}

async function requestPasswordReset(email) {
  const user = await userModel.findByEmail(email);
  const generic = {
    message: "If an account exists for that email, password reset instructions were sent.",
  };
  if (!user) return generic;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await userModel.setPasswordResetToken(user.user_id, rawToken, expiresAt);

  const base = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  const link = `${base.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

  try {
    await mail.sendMail(
      user.email,
      "Password reset — StartupConnect",
      `Reset your password using this link (valid 1 hour): ${link}`,
      `<p>Reset your password using the link below (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`
    );
  } catch (e) {
    console.error("password reset email failed", e.message || e);
  }

  return generic;
}

async function resetPasswordWithToken({ token, newPassword }) {
  const user = await userModel.findByPasswordResetToken(token);
  if (!user) throw { status: 400, message: "Invalid or expired reset token" };

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await userModel.updatePasswordHash(user.user_id, hashedPassword);
  await userModel.clearPasswordResetToken(user.user_id);
  await pool.query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1", [user.user_id]);
  return { message: "Password updated. You can sign in with your new password." };
}

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  requestPasswordReset,
  resetPasswordWithToken,
};
