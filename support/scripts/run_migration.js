const fs = require("fs").promises;
const path = require("path");
const pool = require("../config/db");

async function ensureUploads() {
	const uploadsDir = path.resolve(process.cwd(), "uploads");
	try {
		await fs.mkdir(uploadsDir, { recursive: true });
		console.log("uploads/ directory ensured at", uploadsDir);
	} catch (err) {
		console.error("Failed ensuring uploads directory", err.message || err);
		throw err;
	}
}

async function runSqlFile(filePath) {
	const sql = await fs.readFile(filePath, "utf8");

	// Try to run whole file; if it fails, fallback to splitting statements
	try {
		await pool.query(sql);
		console.log("Migration executed as single batch");
		return;
	} catch (err) {
		console.warn(
			"Batch execution failed, falling back to statement-split:",
			err.message || err,
		);
	}

	const statements = sql
		.split(/;\s*\n/)
		.map((s) => s.trim())
		.filter(Boolean);

	for (const stmt of statements) {
		try {
			await pool.query(stmt);
		} catch (e) {
			console.error("Statement failed:", stmt.slice(0, 120));
			throw e;
		}
	}
	console.log("Migration executed statement-by-statement");
}

async function main() {
	const sqlPath = path.resolve(process.cwd(), "001_init.sql");
	await ensureUploads();
	console.log("Applying migration:", sqlPath);
	await runSqlFile(sqlPath);
	console.log("Migration complete");
	await pool.end();
}

main().catch((err) => {
	console.error("Migration failed:", err.message || err);
	process.exit(1);
});
