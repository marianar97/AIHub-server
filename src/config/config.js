require("dotenv").config();
const z = require("zod");

const configSchema = z.object({
  port: z.number().default(5000),
  nodeEnv: z.string().default("development"),
  youtubeApiKey: z.string(),
  corsOrigins: z.array(z.string()).default(["http://localhost:3000"]),
  rateLimitWindow: z.number().default(900000),
  rateLimitMax: z.number().default(100),
});

const config = configSchema.parse({
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : undefined,
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
});

module.exports = config;
