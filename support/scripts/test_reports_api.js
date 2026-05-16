const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";

async function testReports() {
	console.log("[Reports API Test] Starting tests...\n");

	try {
		// 1. Register a user for submitting reports
		console.log("→ Registering test user...");
		const regRes = await axios.post(`${BASE_URL}/auth/register`, {
			first_name: "Reporter",
			last_name: "User",
			email: `reporter_${Date.now()}@test.com`,
			password: "TestPass123!",
			role: "Investor",
		});

		const userId = regRes.data.user.user_id;
		console.log(`✓ User registered: ${userId}\n`);

		// 2. Login to get token
		console.log("→ Logging in...");
		const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
			email: regRes.data.user.email,
			password: "TestPass123!",
		});

		const token = loginRes.data.token;
		console.log("✓ Login successful, token obtained\n");

		// 3. Create a report
		console.log("→ Submitting a report...");
		const reportRes = await axios.post(
			`${BASE_URL}/reports`,
			{
				target_type: "user",
				target_id: 999,
				reason: "Suspicious activity detected",
			},
			{ headers: { Authorization: `Bearer ${token}` } },
		);

		const reportId = reportRes.data.report.report_id;
		console.log(`✓ Report submitted: ${reportId}`);
		console.log(`  - Status: ${reportRes.data.report.status}`);
		console.log(`  - Created: ${reportRes.data.report.created_at}\n`);

		// 4. Get user's reports
		console.log("→ Retrieving user's reports...");
		const myReportsRes = await axios.get(`${BASE_URL}/reports/my`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		console.log(
			`✓ User reports retrieved: ${myReportsRes.data.reports.length} report(s)`,
		);
		console.log(`  - Report: ${myReportsRes.data.reports[0].report_id}\n`);

		// 5. Create an admin for testing admin endpoints
		console.log("→ Creating admin user...");
		const adminRegRes = await axios.post(`${BASE_URL}/auth/register`, {
			first_name: "Admin",
			last_name: "User",
			email: `admin_${Date.now()}@test.com`,
			password: "AdminPass123!",
			role: "Admin",
		});

		const adminId = adminRegRes.data.user.user_id;
		console.log(`✓ Admin registered: ${adminId}\n`);

		// 6. Admin login
		console.log("→ Admin logging in...");
		const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
			email: adminRegRes.data.user.email,
			password: "AdminPass123!",
		});

		const adminToken = adminLoginRes.data.token;
		console.log("✓ Admin login successful\n");

		// 7. Admin lists reports with sorting
		console.log("→ Admin listing reports with sorting...");
		const adminListRes = await axios.get(
			`${BASE_URL}/admin/reports?limit=10&offset=0&sort_by=created_at&sort_order=DESC`,
			{
				headers: { Authorization: `Bearer ${adminToken}` },
			},
		);

		console.log(
			`✓ Admin retrieved ${adminListRes.data.reports.length} report(s)`,
		);
		if (adminListRes.data.reports.length > 0) {
			const firstReport = adminListRes.data.reports[0];
			console.log(
				`  - Latest: ${firstReport.report_id} (${firstReport.status})\n`,
			);
		}

		// 8. Admin updates report status
		console.log("→ Admin updating report status...");
		const updateRes = await axios.put(
			`${BASE_URL}/admin/reports/${reportId}`,
			{
				status: "reviewed",
				action_taken: "User reviewed, no action needed",
			},
			{ headers: { Authorization: `Bearer ${adminToken}` } },
		);

		console.log(`✓ Report updated: ${updateRes.data.report.status}\n`);

		// 9. Test rate limiting (submit multiple reports quickly)
		console.log("→ Testing rate limiting...");
		let rateLimitHit = false;
		for (let i = 0; i < 12; i++) {
			try {
				await axios.post(
					`${BASE_URL}/reports`,
					{
						target_type: "content",
						reason: `Report ${i}`,
					},
					{ headers: { Authorization: `Bearer ${token}` } },
				);
			} catch (err) {
				if (err.response?.status === 429) {
					rateLimitHit = true;
					console.log(`✓ Rate limiting triggered after ${i} reports\n`);
					break;
				}
			}
		}

		if (!rateLimitHit) {
			console.log("⚠ Rate limiting not triggered (submitted all 12)\n");
		}

		// 10. Test pagination on listing documents
		console.log("→ Admin listing documents with pagination...");
		const docsRes = await axios.get(
			`${BASE_URL}/admin/documents?limit=5&offset=0&sort_by=created_at&sort_order=DESC`,
			{
				headers: { Authorization: `Bearer ${adminToken}` },
			},
		);

		console.log(
			`✓ Documents retrieved: ${docsRes.data.documents.length} document(s)\n`,
		);

		console.log(
			"================================================================================",
		);
		console.log("✨ All report tests passed!");
		console.log(
			"================================================================================\n",
		);

		process.exit(0);
	} catch (err) {
		console.error("❌ Test failed:", err.response?.data || err.message);
		process.exit(1);
	}
}

testReports();
