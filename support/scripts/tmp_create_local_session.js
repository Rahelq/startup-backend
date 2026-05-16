const service = require("../services/videoSessionService");

(async () => {
	try {
		const session = await service.createSession({
			host_id: 2,
			participant_id: 4,
			scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString(),
			duration: 30,
			create_zoom: false,
		});
		console.log("LOCAL_SUCCESS", session);
	} catch (e) {
		console.error("LOCAL_ERROR", e.message || e);
		process.exit(1);
	}
})();
