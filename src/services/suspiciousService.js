const pool = require("../config/db");
const securityLogService = require("./securityLogService");
const notificationService = require("./notificationService");
const mail = require("../utils/mail");

async function recordLoginAttempt({ userId, email, ip, deviceInfo, success, failureReason }) {
  const client = await pool.connect();
  try {
    const values = [
      userId || null,
      email || null,
      ip || null,
      deviceInfo || null,
      !!success,
      failureReason || null,
    ];

    try {
      await client.query(
        `INSERT INTO login_attempts (user_id, email, ip_address, device_info, success, failure_reason, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        values
      );
    } catch {
      await client.query(
        `INSERT INTO login_attempts (user_id, email, ip_address, device_info, was_successful, failure_reason, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        values
      );
    }
  } finally {
    client.release();
  }
}

async function assessSuspicion({ userId, ip, deviceId }) {
  try {
    // simple heuristic: if deviceId not present in user_devices -> suspicious
    const r = await pool.query(
      "SELECT id FROM user_devices WHERE user_id = $1 AND device_id = $2",
      [userId, deviceId]
    );
    const unknownDevice = r.rows.length === 0;
    if (unknownDevice) {
      await securityLogService.recordEvent(userId, "suspicious_login", "high", ip, { deviceId });
      await notificationService.createNotification({
        userId,
        notificationType: "security",
        title: "New device login",
        message: "We detected a login from a new device.",
      });
      // send email alert if email present
      try {
        const userRes = await pool.query("SELECT email FROM users WHERE user_id = $1", [userId]);
        if (userRes.rows.length && userRes.rows[0].email) {
          const to = userRes.rows[0].email;
          const subject = "New device login detected";
          const text =
            "A login from a new device was detected for your StartupConnect account. If this wasn't you, please secure your account.";
          mail.sendMail(to, subject, text, `<p>${text}</p>`).catch(() => {});
        }
      } catch (e) {}
      return { suspicious: true, reason: "unknown_device" };
    }
    return { suspicious: false };
  } catch (e) {
    return { suspicious: false };
  }
}

module.exports = { recordLoginAttempt, assessSuspicion };
