const { urlSchema } = require("../middleware/validation");
const YouTubeService = require("../services/youtubeService");
const { extractVideoId } = require("../utils/youtube");
const logger = require("../utils/logger");
const config = require("../config/config");

async function parseVideoHandler(req, res) {
  try {
    const { url } = await urlSchema.parseAsync(
      req.method === "GET" ? req.query : req.body
    );

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid YouTube URL",
        code: "INVALID_URL",
      });
    }

    const videoData = await YouTubeService.checkVideoAccessibility(videoId);

    res.status(200).json({
      success: true,
      status: 200,
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
        status: 400,
        message: "Validation error",
        errors: error.errors,
      });
    }

    logger.error("Request handler error:", {
      error: error.message,
      stack: error.stack,
    });

    res.status(error.status || 500).json({
      success: false,
      status: error.status || 500,
      message:
        config.nodeEnv === "development"
          ? error.message
          : "Internal server error",
      code: error.code || "INTERNAL_ERROR",
    });
  }
}

module.exports = { parseVideoHandler };
