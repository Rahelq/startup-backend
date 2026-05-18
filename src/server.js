require("dotenv").config();
const http = require("http");
const app = require("./app");
const socketUtils = require("./utils/socket");
const realtimeEmitter = require("./utils/realtimeEmitter");
const sessionReminderService = require("./services/sessionReminderService");
const logger = require("./utils/logger");

const PORT = Number(process.env.PORT) || 3000;

// Enforce presence of JWT secret in production/staging
if (!process.env.JWT_SECRET) {
  logger.error("Missing JWT_SECRET environment variable. Aborting startup.");
  process.exit(1);
}

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
  logger.info({ port: PORT }, "Server running");
  logger.info({ database: process.env.DB_NAME || "startup_connect" }, "Database connected");
  logger.info("Socket.io initialized");
  logger.info("Session reminders scheduled");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
