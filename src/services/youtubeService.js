const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");
const { YouTubeError } = require("../utils/errors");
const { formatDuration } = require("../utils/youtube");

class YouTubeService {
  static async checkVideoAccessibility(videoId) {
    try {
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
        logger.warn("oEmbed check failed, falling back to Data API", {
          videoId,
          error: oembedError.message,
        });
      }

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
        title: videoData.snippet.title,
        channelTitle: videoData.snippet.channelTitle,
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

module.exports = YouTubeService;
