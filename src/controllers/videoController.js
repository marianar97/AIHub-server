const { urlSchema } = require("../middleware/validation");
const YouTubeService = require("../services/youtubeService");
const { extractVideoId } = require("../utils/youtube");
const logger = require("../utils/logger");
const config = require("../config/config");
const Video = require("../models/Video");

const z = require("zod"); // Add this import

const validTags = [
  "Intermediate",
  "Foundation",
  "Beginner",
  "Advanced",
  "Applied",
  "Theory",
];

async function parseVideoHandler(req, res) {
  try {
    const { url, tags } = await urlSchema.parseAsync(
      req.method === "GET" ? req.query : req.body
    );

    // Validate tags
    const invalidTags = tags.filter((tag) => !validTags.includes(tag));
    if (invalidTags.length > 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid tags provided",
        invalidTags,
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid YouTube URL",
        code: "INVALID_URL",
      });
    }

    // Check if video already exists in database
    let video = await Video.findOne({ videoId });
    if (video) {
      // Update tags if video exists
      video.tags = tags;
      await video.save();

      return res.status(200).json({
        success: true,
        status: 200,
        message: "Video already exists, tags updated",
        data: video,
      });
    }

    const videoData = await YouTubeService.checkVideoAccessibility(videoId);

    console.log("Video data:", videoD);
    // Create new video document
    video = new Video({
      videoId,
      url,
      tags,
      title: videoData.title,
      channelTitle: videoData.channelTitle,
      duration: videoData.duration,
      description: videoData.description,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnails: videoData.thumbnails,
    });

    // Save to database
    await video.save();

    res.status(200).json({
      success: true,
      status: 200,
      message: "Video saved successfully",
      data: video,
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

async function getVideos(req, res) {
  try {
    const videos = await Video.find({}).sort({ createdAt: -1 }).select("-__v");

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Videos retrieved successfully",
      data: videos,
      count: videos.length,
    });
  } catch (error) {
    logger.error("Request handler error:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}

module.exports = { parseVideoHandler, getVideos };
