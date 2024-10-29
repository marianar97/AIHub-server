require("dotenv").config();
const z = require("zod");

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not defined in environment variables");
  process.exit(1);
}

const configSchema = z.object({
  port: z.number().default(5000),
  nodeEnv: z.string().default("development"),
  youtubeApiKey: z.string(),
  corsOrigins: z.array(z.string()).default(["http://localhost:3000"]),
  rateLimitWindow: z.number().default(900000),
  rateLimitMax: z.number().default(100),
  mongoUri: z.string(), // Add this line to include mongoUri in the schema
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
  mongoUri: process.env.MONGO_URI, // Add this line to parse mongoUri
});

module.exports = config;
