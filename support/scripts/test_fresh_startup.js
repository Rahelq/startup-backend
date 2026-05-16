const baseUrl = "http://localhost:3000";
const stamp = Date.now();
const email = `fresh${stamp}@example.com`;
const password = "123456";

async function main() {
	const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			first_name: "Fresh",
			last_name: "Startup",
			email,
			password,
			role: "Startup",
		}),
	});
	const registerText = await registerRes.text();
	console.log("REGISTER_STATUS", registerRes.status);
	console.log(registerText);
	if (!registerRes.ok) throw new Error("Register failed");

	const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	const loginText = await loginRes.text();
	console.log("LOGIN_STATUS", loginRes.status);
	console.log(loginText);
	if (!loginRes.ok) throw new Error("Login failed");
	const loginJson = JSON.parse(loginText);
	const token = loginJson.token;

	const profileRes = await fetch(`${baseUrl}/api/startups/profile`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			startup_name: "Acme Fresh",
			industry: "Tech",
			description: "A fresh startup profile",
			business_stage: "Seed",
			founded_year: 2025,
			team_size: 5,
			location: "NY",
			website: "https://acme.example",
			funding_needed: 100000,
		}),
	});
	const profileText = await profileRes.text();
	console.log("PROFILE_STATUS", profileRes.status);
	console.log(profileText);
	if (!profileRes.ok) throw new Error("Create startup profile failed");

	const updateRes = await fetch(`${baseUrl}/api/startups/profile`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			startup_name: "Acme Fresh Updated",
			industry: "Tech",
			description: "An updated startup profile",
			business_stage: "Growth",
			founded_year: 2026,
			team_size: 8,
			location: "NYC",
			website: "https://acme.example",
			funding_needed: 250000,
		}),
	});
	const updateText = await updateRes.text();
	console.log("UPDATE_STATUS", updateRes.status);
	console.log(updateText);
}

main().catch((err) => {
	console.error("SCRIPT_ERROR", err.message);
	process.exit(1);
});



