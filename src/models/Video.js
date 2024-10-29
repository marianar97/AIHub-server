const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
  },
  url: {
    type: String,
    required: true,
  },
  tags: [
    {
      type: String,
      enum: [
        "Intermediate",
        "Foundation",
        "Beginner",
        "Advanced",
        "Applied",
        "Theory",
      ],
      require: false,
    },
  ],
  title: String,
  description: String,
  channelTitle: String,
  duration: String,
  embedUrl: String,
  thumbnails: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

videoSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
