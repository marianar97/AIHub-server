const app = require("./app");
const config = require("./config/config");
const logger = require("./utils/logger");

const server = app.listen(config.port, () => {
  logger.info(
    `Server running in ${config.nodeEnv} mode at http://localhost:${config.port}`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received. Closing HTTP server...");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});
