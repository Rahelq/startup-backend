const pool = require("../config/db");
let speakeasy;
try {
  speakeasy = require("speakeasy");
} catch (e) {
  speakeasy = null;
}
const crypto = require("crypto");
let qrcode;
try {
  qrcode = require("qrcode");
} catch (e) {
  qrcode = null;
}

function generateBackupCodes(count = 6) {
  const codes = [];
  for (let i = 0; i < count; i++) codes.push(crypto.randomBytes(4).toString("hex"));
  return codes;
}

async function createSetup(userId) {
  if (!speakeasy) throw new Error("speakeasy not installed");
  const secret = speakeasy.generateSecret({ length: 20 });
  const backup_codes = generateBackupCodes();
  const client = await pool.connect();
  try {
    const r = await client.query(
      "INSERT INTO two_factor_auth (user_id, secret, backup_codes, is_enabled, updated_at) VALUES ($1,$2,$3,false,NOW()) ON CONFLICT (user_id) DO UPDATE SET secret = $2, backup_codes = $3, updated_at = NOW() RETURNING *",
      [userId, secret.base32, backup_codes]
    );
    return { secret: secret.otpauth_url, base32: secret.base32, backup_codes };
  } finally {
    client.release();
  }
}

async function getSetupQRCode(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT secret FROM two_factor_auth WHERE user_id = $1", [userId]);
    if (!r.rows.length) return null;
    const secretUrl = r.rows[0].secret;
    if (!qrcode) return { otpauth_url: secretUrl };
    const dataUrl = await qrcode.toDataURL(secretUrl);
    return { otpauth_url: secretUrl, qr: dataUrl };
  } finally {
    client.release();
  }
}

async function redeemBackupCode(userId, code) {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT backup_codes FROM two_factor_auth WHERE user_id = $1", [
      userId,
    ]);
    if (!r.rows.length) return false;
    const codes = r.rows[0].backup_codes || [];
    const idx = codes.indexOf(code);
    if (idx === -1) return false;
    codes.splice(idx, 1);
    await client.query(
      "UPDATE two_factor_auth SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2",
      [codes, userId]
    );
    return true;
  } finally {
    client.release();
  }
}

async function verifyToken(userId, token) {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT secret FROM two_factor_auth WHERE user_id = $1", [userId]);
    if (!r.rows.length) return false;
    const { secret } = r.rows[0];
    if (!speakeasy) return false;
    return speakeasy.totp.verify({ secret, encoding: "base32", token, window: 1 });
  } finally {
    client.release();
  }
}

async function enable(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "UPDATE two_factor_auth SET is_enabled = true, enabled_at = NOW(), updated_at = NOW() WHERE user_id = $1 RETURNING *",
      [userId]
    );
    return r.rows[0];
  } finally {
    client.release();
  }
}

async function disable(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "UPDATE two_factor_auth SET is_enabled = false, updated_at = NOW() WHERE user_id = $1 RETURNING *",
      [userId]
    );
    return r.rows[0];
  } finally {
    client.release();
  }
}

module.exports = { createSetup, verifyToken, enable, disable, getSetupQRCode, redeemBackupCode };
