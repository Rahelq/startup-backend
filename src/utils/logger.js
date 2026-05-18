let logger = console;

try {
  const pino = require("pino");
  const level = process.env.LOG_LEVEL || "info";
  const opts = { level };
  try {
    const pretty = process.env.NODE_ENV !== "production";
    logger = pino(opts, pretty && pino.prettyPrint ? pino.prettyPrint() : undefined);
  } catch (e) {
    logger = pino(opts);
  }
} catch (e) {
  // fallback to console
  logger = console;
}

module.exports = logger;
