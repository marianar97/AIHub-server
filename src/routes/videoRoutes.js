const express = require("express");
const {
  parseVideoHandler,
  getVideos,
} = require("../controllers/videoController");

const router = express.Router();

router.post("/parse-video", parseVideoHandler);
router.get("/get-videos", getVideos);

module.exports = router;
