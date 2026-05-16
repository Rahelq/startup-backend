const pool = require("../config/db");
const bcrypt = require("bcrypt");

(async () => {
	try {
		const email = "admin@startupconnect.test";
		const password = "AdminPass123!";
		const hash = await bcrypt.hash(password, 10);

		const exists = await pool.query(
			"SELECT user_id FROM users WHERE email=$1",
			[email],
		);
		if (exists.rows.length) {
			console.log("Admin already exists:", email);
			process.exit(0);
		}

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
		console.error("Error creating admin:", err.message || err);
		process.exit(1);
	}
})();
