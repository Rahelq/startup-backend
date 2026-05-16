const bcrypt = require("bcrypt");
const pool = require("../config/db");

async function insertUser(client, user) {
	const passwordHash = await bcrypt.hash(user.password, 10);
	const result = await client.query(
		`INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, email, role`,
		[user.firstName, user.lastName, user.email, passwordHash, user.role],
	);
	return result.rows[0];
}

async function main() {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const adminUser = await insertUser(client, {
			firstName: "Ada",
			lastName: "Admin",
			email: "admin@startupconnect.test",
			password: "Demo123!",
			role: "Admin",
		});

		await client.query(
			`INSERT INTO admins (user_id, privilege_level)
		       VALUES ($1, $2)`,
			[adminUser.user_id, 10],
		);

		// Approve seeded admin immediately
		await client.query(
			"UPDATE users SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE user_id = $1",
			[adminUser.user_id],
		);

		const startupUser = await insertUser(client, {
			firstName: "Sara",
			lastName: "Startup",
			email: "startup@startupconnect.test",
			password: "Demo123!",
			role: "Startup",
		});

		// approve demo startup
		await client.query(
			"UPDATE users SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE user_id = $2",
			[adminUser.user_id, startupUser.user_id],
		);

		const startupProfile = await client.query(
			`INSERT INTO startups (
         user_id,
         startup_name,
         industry,
         description,
         business_stage,
         founded_year,
         team_size,
         location,
         website,
         funding_needed
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING startup_id`,
			[
				startupUser.user_id,
				"Nova Labs",
				"Technology",
				"AI tools for startups",
				"Seed",
				2025,
				5,
				"Addis Ababa",
				"https://novalabs.example",
				150000,
			],
		);

		const investorUser = await insertUser(client, {
			firstName: "Ian",
			lastName: "Investor",
			email: "investor@startupconnect.test",
			password: "Demo123!",
			role: "Investor",
		});

		// approve demo investor
		await client.query(
			"UPDATE users SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE user_id = $2",
			[adminUser.user_id, investorUser.user_id],
		);

		const investorProfile = await client.query(
			`INSERT INTO investors (
         user_id,
         investor_type,
         organization_name,
         investment_budget,
         preferred_industry,
         investment_stage,
         country,
         portfolio_size
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING investor_id`,
			[
				investorUser.user_id,
				"Angel",
				"Skyline Ventures",
				500000,
				"Technology",
				"Seed",
				"Ethiopia",
				12,
			],
		);

		const mentorUser = await insertUser(client, {
			firstName: "Mina",
			lastName: "Mentor",
			email: "mentor@startupconnect.test",
			password: "Demo123!",
			role: "Mentor",
		});

		// approve demo mentor
		await client.query(
			"UPDATE users SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE user_id = $2",
			[adminUser.user_id, mentorUser.user_id],
		);

		const mentorProfile = await client.query(
			`INSERT INTO mentors (
         user_id,
         headline,
         expertise,
         years_experience,
         hourly_rate,
         country,
         bio,
         availability
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING mentor_id`,
			[
				mentorUser.user_id,
				"Growth and fundraising mentor",
				"Go-to-market, fundraising, product strategy",
				8,
				120,
				"Ethiopia",
				"Helps early-stage startups validate and scale.",
				JSON.stringify("Weekdays"),
			],
		);

		const project = await client.query(
			`INSERT INTO projects (
         startup_id,
         project_title,
         description,
         funding_goal,
         amount_raised,
         status,
         start_date,
         end_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING project_id`,
			[
				startupProfile.rows[0].startup_id,
				"AI Growth Engine",
				"Automates lead generation and onboarding",
				100000,
				10000,
				"active",
				"2026-04-01",
				"2026-12-31",
			],
		);

		await client.query(
			`INSERT INTO investment_requests (
         startup_id,
         investor_id,
         project_id,
         requested_amount,
         proposal_message,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				startupProfile.rows[0].startup_id,
				investorProfile.rows[0].investor_id,
				project.rows[0].project_id,
				50000,
				"We would like to close this seed round with your support.",
				"pending",
			],
		);

		await client.query(
			`INSERT INTO mentorship_requests (
         startup_id,
         mentor_id,
         subject,
         message,
         status
       )
       VALUES ($1, $2, $3, $4, $5)`,
			[
				startupProfile.rows[0].startup_id,
				mentorProfile.rows[0].mentor_id,
				"Fundraising guidance",
				"Need help preparing for investor meetings and pitch practice.",
				"pending",
			],
		);

		await client.query("COMMIT");

		console.log("Seed complete. Demo accounts created:");
		console.log("- Admin: admin@startupconnect.test / Demo123!");
		console.log("- Startup: startup@startupconnect.test / Demo123!");
		console.log("- Investor: investor@startupconnect.test / Demo123!");
		console.log("- Mentor: mentor@startupconnect.test / Demo123!");
	} catch (err) {
		await client.query("ROLLBACK");
		console.error("Seed failed:", err);
		console.error(err.stack);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
}

main();
