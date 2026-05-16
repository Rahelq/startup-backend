const pool = require("../config/db");

async function main() {
	const emails = [
		"admin@startupconnect.test",
		"startup@startupconnect.test",
		"mentor@startupconnect.test",
		"investor@startupconnect.test",
	];
	for (const e of emails) {
		try {
			await pool.query(
				"UPDATE users SET is_approved = true, approved_at = NOW() WHERE email = $1",
				[e],
			);
			console.log("Approved", e);
		} catch (err) {
			console.error("Failed approving", e, err.message || err);
		}
	}
	await pool.end();
}

main().catch((err) => {
	console.error(err.message || err);
	process.exit(1);
});
