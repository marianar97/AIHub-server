const app = require("./app");
const config = require("./config/config");
const logger = require("./utils/logger");
const connectDB = require("./config/database");

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT;
    const server = app.listen(config.port, () => {
      logger.info(
        `Server running in ${config.nodeEnv} mode at http://localhost:${config.port}`
      );
    });
    server.on("error", (error) => {
      console.log("Server startup failed:", error);
      logger.error("Server startup failed:", error);
    });
  } catch (error) {
    logger.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
