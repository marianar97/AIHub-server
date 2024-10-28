class YouTubeError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
    this.code = code;
  }
}

module.exports = { YouTubeError };
