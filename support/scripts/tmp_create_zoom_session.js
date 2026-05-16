const service = require("../services/videoSessionService");

(async () => {
	try {
		const session = await service.createSession({
			host_id: 2,
			participant_id: 4,
			scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString(),
			duration: 30,
			create_zoom: true,
		});
		console.log("ZOOM_SUCCESS", session);
	} catch (e) {
		console.error("ZOOM_ERROR", e.response ? e.response.data : e.message || e);
		process.exit(1);
	}
})();
