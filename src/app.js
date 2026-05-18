const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("./config/db");
let helmet;
let cors;
let swaggerUi;
let yaml;
const redisRateLimiter = require("./middleware/redisRateLimiter");
try {
  helmet = require("helmet");
} catch {
  helmet = null;
}
try {
  cors = require("cors");
} catch {
  cors = null;
}
try {
  swaggerUi = require("swagger-ui-express");
  yaml = require("js-yaml");
} catch {
  swaggerUi = null;
  yaml = null;
}

// Import all routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const testRoutes = require("./routes/testRoutes");
const startupRoutes = require("./routes/startupRoutes");
const projectRoutes = require("./routes/projectRoutes");
const investmentRoutes = require("./routes/investmentRoutes");
const investorRoutes = require("./routes/investorRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const mentorshipRoutes = require("./routes/mentorshipRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const activityRoutes = require("./routes/activityRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const twoFactorRoutes = require("./routes/twoFactorRoutes");
const blockRoutes = require("./routes/blockRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const adminSecurityRoutes = require("./routes/adminSecurityRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const interactionRoutes = require("./routes/interactionRoutes");
// connectionLayerRoutes removed (reverting to previous state)
const connectionLayerRoutes = require("./routes/connectionLayerRoutes");
const investmentWorkflowRoutes = require("./routes/investmentWorkflowRoutes");
const mentorshipWorkflowRoutes = require("./routes/mentorshipWorkflowRoutes");
const projectWorkflowRoutes = require("./routes/projectWorkflowRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const videoSessionRoutes = require("./routes/videoSessionRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const reputationRoutes = require("./routes/reputationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const intelligenceRoutes = require("./routes/intelligenceRoutes");

let openApiSpec = null;
if (swaggerUi && yaml) {
  const openApiPath = path.join(__dirname, "..", "support", "docs", "openapi.yml");
  if (fs.existsSync(openApiPath)) {
    openApiSpec = yaml.load(fs.readFileSync(openApiPath, "utf8"));
  }
}

const app = express();

// Middleware

// Security headers (optional)
if (helmet) app.use(helmet());

// CORS (optional)
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : undefined;
if (cors) app.use(cors({ origin: corsOrigins || true }));

// Global rate limiting (uses Redis if configured, otherwise in-memory)
app.use(redisRateLimiter({ windowSec: 60, maxAttempts: 600 }));

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

// ✅ Routes FIRST
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Test DB connection endpoint
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected ✅",
      time: result.rows[0],
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

if (swaggerUi && openApiSpec) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
  app.get("/api/docs.json", (req, res) => {
    res.json(openApiSpec);
  });
}

// Mount all routes
app.use("/api/test", testRoutes);
app.use("/api/startups", startupRoutes);
app.use("/api/projects", projectRoutes);

// LEGACY routes (deprecated, but kept for backward compatibility)
app.use("/api/investments", investmentRoutes);
app.use("/api/mentorship", mentorshipRoutes);

// Workflow routes (primary - use these for new integrations)
app.use("/api/investment-workflow", investmentWorkflowRoutes);
app.use("/api/mentorship-workflow", mentorshipWorkflowRoutes);
app.use("/api/projects-workflow", projectWorkflowRoutes);
app.use("/api/resources", resourceRoutes);

app.use("/api/investors", investorRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/security/devices", deviceRoutes);
app.use("/api/security/2fa", twoFactorRoutes);
app.use("/api/block", blockRoutes);
app.use("/api/security/sessions", sessionRoutes);
app.use("/api/admin/security", adminSecurityRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/interactions", interactionRoutes);
// Connection Layer (Phase 2) mounted
app.use("/api/connection", connectionLayerRoutes);
app.use("/api/video-sessions", videoSessionRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/reputation", reputationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/intelligence", intelligenceRoutes);
// phase3 temporary routes removed; functionality merged into workflow routes

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

module.exports = app;
