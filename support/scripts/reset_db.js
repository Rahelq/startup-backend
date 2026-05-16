const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");

const tables = [
	"audit_logs",
	"reviews",
	"notifications",
	"messages",
	"payments",
	"mentorship_sessions",
	"mentorship_requests",
	"investments",
	"investment_requests",
	"documents",
	"projects",
	"mentors",
	"investors",
	"startups",
	"refresh_tokens",
	"admins",
	"users",
];

async function clearUploadsDirectory() {
	const uploadsDir = path.join(__dirname, "..", "uploads");

	try {
		const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
		await Promise.all(
			entries.map(async (entry) => {
				const entryPath = path.join(uploadsDir, entry.name);
				if (entry.isFile()) {
					await fs.unlink(entryPath);
					return;
				}
				if (entry.isDirectory()) {
					await fs.rm(entryPath, { recursive: true, force: true });
				}
			}),
		);
	} catch (err) {
		if (err.code !== "ENOENT") {
			throw err;
		}
	}
}

async function main() {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		await client.query(
			`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE;`,
		);
		await client.query("COMMIT");

		await clearUploadsDirectory();

		console.log(
			"Database reset complete. All tables cleared and identities restarted.",
		);
		console.log("Uploads directory cleared.");
	} catch (err) {
		await client.query("ROLLBACK");
		console.error("Database reset failed:", err.message);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
}

main();
