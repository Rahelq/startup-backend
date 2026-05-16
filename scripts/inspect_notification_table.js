const pool = require("../src/config/db");
(async () => {
  try {
    const r = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='notification_preferences' ORDER BY ordinal_position`
    );
    console.log(r.rows);
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
