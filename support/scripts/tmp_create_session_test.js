const axios = require("axios");

(async function () {
	try {
		const token =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJyb2xlIjoibWVudG9yIiwiaWF0IjoxNzc4MDIxMzg0fQ.nVuPDZGFJqNKrOLN-qn0IyqQUOWjVqAraaqLSxEWc0I";
		const payload = {
			host_id: 2,
			participant_id: 4,
			scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			duration: 30,
			provider: "zoom",
			create_zoom: true,
		};
		const res = await axios.post(
			"http://localhost:3000/api/video-sessions",
			payload,
			{ headers: { Authorization: `Bearer ${token}` } },
		);
		console.log("SUCCESS", JSON.stringify(res.data, null, 2));
	} catch (err) {
		if (err.response) {
			console.error(
				"ERROR_RESPONSE",
				JSON.stringify(err.response.data, null, 2),
			);
		} else {
			console.error("ERROR", err.message);
		}
		process.exit(1);
	}
})();
