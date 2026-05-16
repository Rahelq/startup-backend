const pool = require("../config/db");

(async () => {
	try {
		const res = await pool.query(
			"SELECT startup_id, user_id, startup_name, created_at FROM startups ORDER BY startup_id",
		);
		console.log("startups rows:", res.rows.length);
		console.table(res.rows);
		await pool.end();
	} catch (err) {
		console.error("Error querying startups:", err.message);
		process.exit(1);
	}
})();
