const pool = require("../config/db");

async function getSettings(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      `SELECT s.*, p.profile_visibility, n.email_digest_frequency FROM user_settings s
       LEFT JOIN privacy_settings p ON p.user_id = s.user_id
       LEFT JOIN notification_preferences n ON n.user_id = s.user_id
       WHERE s.user_id = $1`,
      [userId]
    );
    if (r.rows.length) return r.rows[0];
    // return defaults if not set
    return {
      user_id: userId,
      language: "en",
      theme: "light",
      timezone: "UTC",
      date_format: "YYYY-MM-DD",
      time_format: "24h",
      text_size: "medium",
      high_contrast: false,
      reduce_motion: false,
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      marketing_notifications: false,
      sound_enabled: true,
      auto_play_videos: false,
      dashboard_layout: {},
    };
  } finally {
    client.release();
  }
}

async function upsertSettings(userId, values) {
  const client = await pool.connect();
  try {
    const cols = Object.keys(values);
    if (cols.length === 0) {
      const r = await client.query("SELECT * FROM user_settings WHERE user_id = $1", [userId]);
      return r.rows[0] || null;
    }
    const params = [userId, ...cols.map((k) => values[k])];
    const updates = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
    const sql = `INSERT INTO user_settings (user_id, ${cols.join(",")}) VALUES ($1, ${cols
      .map((_, i) => `$${i + 2}`)
      .join(",")}) ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = NOW() RETURNING *`;
    const r = await client.query(sql, params);
    return r.rows[0];
  } finally {
    client.release();
  }
}

async function getPrivacy(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT * FROM privacy_settings WHERE user_id = $1", [userId]);
    return r.rows[0] || null;
  } finally {
    client.release();
  }
}

async function upsertPrivacy(userId, values) {
  const client = await pool.connect();
  try {
    const cols = Object.keys(values);
    if (cols.length === 0) {
      const r = await client.query("SELECT * FROM privacy_settings WHERE user_id = $1", [userId]);
      return r.rows[0] || null;
    }
    const params = [userId, ...cols.map((k) => values[k])];
    const updates = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
    const sql = `INSERT INTO privacy_settings (user_id, ${cols.join(",")}) VALUES ($1, ${cols
      .map((_, i) => `$${i + 2}`)
      .join(",")}) ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = NOW() RETURNING *`;
    const r = await client.query(sql, params);
    return r.rows[0];
  } finally {
    client.release();
  }
}

async function getNotificationPreferences(userId) {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT * FROM notification_preferences WHERE user_id = $1", [
      userId,
    ]);
    const row = r.rows[0] || null;
    if (!row) return null;

    // normalize legacy boolean-column schema into channels/preferences shape
    if (row.email_digest_frequency || row.interaction_notifications !== undefined) {
      return {
        user_id: row.user_id,
        channels: {
          email: !!(row.email_digest_frequency || row.email_digest_frequency === "instant"),
        },
        preferences: { digest: row.email_digest_frequency || null },
        raw: row,
      };
    }
    return row;
  } finally {
    client.release();
  }
}

async function upsertNotificationPreferences(userId, values) {
  const client = await pool.connect();
  try {
    const cols = Object.keys(values);
    if (cols.length === 0) {
      const r = await client.query("SELECT * FROM notification_preferences WHERE user_id = $1", [
        userId,
      ]);
      return r.rows[0] || null;
    }

    // inspect actual table columns so we only try to update existing columns
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='notification_preferences'`
    );
    const existing = new Set(colRes.rows.map((r) => r.column_name));

    // If incoming keys directly match existing columns, upsert them
    const intersection = cols.filter((c) => existing.has(c));
    if (intersection.length > 0) {
      const params = [userId, ...intersection.map((k) => values[k])];
      const updates = intersection.map((c, i) => `${c} = $${i + 2}`).join(", ");
      const sql = `INSERT INTO notification_preferences (user_id, ${intersection.join(",")}) VALUES ($1, ${intersection
        .map((_, i) => `$${i + 2}`)
        .join(
          ","
        )}) ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = NOW() RETURNING *`;
      const r = await client.query(sql, params);
      return r.rows[0];
    }

    // Fallback: support payload shape like { channels: {...}, preferences: { digest } }
    const updates = [];
    const params = [userId];
    // map preferences.digest -> email_digest_frequency if present
    if (values.preferences && values.preferences.digest && existing.has("email_digest_frequency")) {
      params.push(values.preferences.digest);
      updates.push({ col: "email_digest_frequency", paramIndex: params.length });
    }

    if (updates.length === 0) {
      // nothing we can map, just return current row
      const r = await client.query("SELECT * FROM notification_preferences WHERE user_id = $1", [
        userId,
      ]);
      return r.rows[0] || null;
    }

    const setClause = updates.map((u) => `${u.col} = $${u.paramIndex}`).join(", ");
    const sql = `INSERT INTO notification_preferences (user_id, ${updates.map((u) => u.col).join(",")}) VALUES ($1, ${updates
      .map((u) => `$${u.paramIndex}`)
      .join(
        ","
      )}) ON CONFLICT (user_id) DO UPDATE SET ${setClause}, updated_at = NOW() RETURNING *`;
    const r = await client.query(sql, params);
    return r.rows[0];
  } finally {
    client.release();
  }
}

module.exports = {
  getSettings,
  upsertSettings,
  getPrivacy,
  upsertPrivacy,
  getNotificationPreferences,
  upsertNotificationPreferences,
};
