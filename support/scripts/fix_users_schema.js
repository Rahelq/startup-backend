const pool = require("../config/db");

async function columnExists(column) {
	const res = await pool.query(
		"SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name = $1",
		[column],
	);
	return res.rowCount > 0;
}

async function addColumnIfMissing(columnDef) {
	try {
		await pool.query(columnDef);
		console.log("Executed:", columnDef.split("\n")[0]);
	} catch (err) {
		console.error(
			"Failed to execute:",
			columnDef.split("\n")[0],
			err.message || err,
		);
		throw err;
	}
}

async function main() {
	if (!(await columnExists("is_approved"))) {
		await addColumnIfMissing(
			"ALTER TABLE users ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT FALSE",
		);
	} else {
		console.log("is_approved exists");
	}

	if (!(await columnExists("approved_by"))) {
		await addColumnIfMissing(
			"ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL",
		);
	} else {
		console.log("approved_by exists");
	}

	if (!(await columnExists("approved_at"))) {
		await addColumnIfMissing(
			"ALTER TABLE users ADD COLUMN approved_at TIMESTAMPTZ",
		);
	} else {
		console.log("approved_at exists");
	}

	console.log("User schema fixup complete");
	await pool.end();
}

main().catch((err) => {
	console.error("Schema fix failed", err.message || err);
	process.exit(1);
});
