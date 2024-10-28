require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const axios = require("axios");
const winston = require("winston");
const { z } = require("zod");

// Environment configuration with validation
const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000"],
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "900000", 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
};

// Validate YouTube API key
if (!config.youtubeApiKey) {
  throw new Error("YOUTUBE_API_KEY environment variable is required");
}

// Configure logger
const logger = winston.createLogger({
  level: config.nodeEnv === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10kb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Request logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Utility Functions
class YouTubeError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
    this.code = code;
  }
}

function formatDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "Unknown duration";

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

function extractVideoId(url) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// YouTube API Service
class YouTubeService {
  static async checkVideoAccessibility(videoId) {
    try {
      // First try oEmbed to check public accessibility
      try {
        await axios.get(
          `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`,
          { timeout: 5000 }
        );
      } catch (oembedError) {
        if (
          oembedError.response?.status === 401 ||
          oembedError.response?.status === 404
        ) {
          throw new YouTubeError(
            "Video not accessible",
            404,
            "VIDEO_NOT_ACCESSIBLE"
          );
        }
        // Log oEmbed error but continue with Data API
        logger.warn("oEmbed check failed, falling back to Data API", {
          videoId,
          error: oembedError.message,
        });
      }

      // Get full video details from Data API
      const { data } = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos",
        {
          params: {
            part: "snippet,contentDetails,status",
            id: videoId,
            key: config.youtubeApiKey,
          },
          timeout: 5000,
        }
      );

      if (!data.items?.length) {
        throw new YouTubeError("Video not found", 404, "VIDEO_NOT_FOUND");
      }

      const videoData = data.items[0];

      if (videoData.status.privacyStatus === "private") {
        throw new YouTubeError("Video is private", 403, "VIDEO_PRIVATE");
      }

      return {
        exists: true,
        title: videoData.snippet.title,
        author: videoData.snippet.channelTitle,
        duration: formatDuration(videoData.contentDetails.duration),
        rawDuration: videoData.contentDetails.duration,
        thumbnails: videoData.snippet.thumbnails,
      };
    } catch (error) {
      if (error instanceof YouTubeError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorReason = error.response?.data?.error?.errors?.[0]?.reason;

        if (status === 401) {
          throw new YouTubeError("Invalid API key", 500, "INVALID_API_KEY");
        }
        if (status === 403) {
          if (errorReason === "quotaExceeded") {
            throw new YouTubeError("API quota exceeded", 429, "QUOTA_EXCEEDED");
          }
          throw new YouTubeError("API access forbidden", 403, "API_FORBIDDEN");
        }
      }

      logger.error("YouTube API Error", {
        videoId,
        error: error.message,
        stack: error.stack,
      });

      throw new YouTubeError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }
}

// Request Validation
const urlSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

// Route Handlers
async function parseVideoHandler(req, res) {
  try {
    const { url } = await urlSchema.parseAsync(
      req.method === "GET" ? req.query : req.body
    );

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Invalid YouTube URL",
        code: "INVALID_URL",
      });
    }

    const videoData = await YouTubeService.checkVideoAccessibility(videoId);

    res.json({
      success: true,
      data: {
        videoId,
        ...videoData,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    if (error instanceof YouTubeError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    logger.error("Request handler error:", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message:
        config.nodeEnv === "development"
          ? error.message
          : "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}

// Routes
app.get("/parse-video", parseVideoHandler);
app.post("/parse-video", parseVideoHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "ROUTE_NOT_FOUND",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    message:
      config.nodeEnv === "development" ? err.message : "Internal server error",
    code: "INTERNAL_ERROR",
  });
});

// Start server
app.listen(config.port, () => {
  logger.info(
    `Server running in ${config.nodeEnv} mode at http://localhost:${config.port}`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Process terminated");
  });
});
