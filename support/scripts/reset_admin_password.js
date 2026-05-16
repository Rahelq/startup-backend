const pool = require("../config/db");
const bcrypt = require("bcrypt");

(async () => {
	try {
		const email = "admin@startupconnect.test";
		const password = "AdminPass123!";
		const hash = await bcrypt.hash(password, 10);

		const res = await pool.query(
			"UPDATE users SET password_hash=$1, is_approved=true WHERE email=$2 RETURNING user_id",
			[hash, email],
		);
		if (res.rowCount) {
			console.log("Updated admin password:");
			console.log("  email:", email);
			console.log("  password:", password);
			process.exit(0);
		}

		// If not found, insert
		await pool.query(
			`INSERT INTO users (first_name, last_name, email, password_hash, role, is_approved, created_at)
       VALUES ($1,$2,$3,$4,$5,true,NOW())`,
			["Admin", "User", email, hash, "Admin"],
		);
		console.log("Created admin:");
		console.log("  email:", email);
		console.log("  password:", password);
		process.exit(0);
	} catch (err) {
		console.error("Error:", err.message || err);
		process.exit(1);
	}
})();
