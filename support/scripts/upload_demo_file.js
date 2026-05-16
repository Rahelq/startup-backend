const fs = require("fs/promises");
const path = require("path");

const baseUrl = "http://localhost:3000";
const email = "startup@startupconnect.test";
const password = "Demo123!";
const sampleFilePath = path.join(__dirname, "demo_pitch_deck.txt");

async function main() {
	const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	const loginText = await loginRes.text();
	console.log("LOGIN_STATUS", loginRes.status);
	console.log(loginText);

	if (!loginRes.ok) {
		throw new Error("Login failed");
	}

	const { token } = JSON.parse(loginText);
	const fileBuffer = await fs.readFile(sampleFilePath);
	const formData = new FormData();

	formData.append("startup_name", "Nova Labs");
	formData.append("industry", "Technology");
	formData.append("description", "AI tools for startups");
	formData.append("business_stage", "Seed");
	formData.append("founded_year", "2025");
	formData.append("team_size", "5");
	formData.append("location", "Addis Ababa");
	formData.append("website", "https://novalabs.example");
	formData.append("funding_needed", "150000");
	formData.append(
		"pitch_deck",
		new Blob([fileBuffer], { type: "text/plain" }),
		"demo_pitch_deck.txt",
	);

	const uploadRes = await fetch(`${baseUrl}/api/startups/profile`, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	const uploadText = await uploadRes.text();
	console.log("UPLOAD_STATUS", uploadRes.status);
	console.log(uploadText);
}

main().catch((err) => {
	console.error("UPLOAD_DEMO_FAILED", err.message);
	process.exit(1);
});
