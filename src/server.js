require("dotenv").config();
const http = require("http");
const app = require("./app");
const socketUtils = require("./utils/socket");
const realtimeEmitter = require("./utils/realtimeEmitter");
const sessionReminderService = require("./services/sessionReminderService");

const PORT = Number(process.env.PORT) || 3000;

// Create HTTP server with Socket.io
const server = http.createServer(app);
socketUtils.init(server);

// Initialize real-time emitter with Socket.io instance
const io = socketUtils.getIO();
realtimeEmitter.init(io);

// Start session reminder scheduler
sessionReminderService.startSessionReminderScheduler();

// Start server
server.listen(PORT, () => {
	console.log(`✅ Server running on port ${PORT}`);
	console.log(`📍 Database: ${process.env.DB_NAME || "startup_connect"}`);
	console.log("🔌 Socket.io: Initialized");
	console.log("📅 Session Reminders: Running");
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received, shutting down gracefully");
	server.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});
