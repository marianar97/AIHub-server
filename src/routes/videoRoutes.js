const express = require("express");
const { parseVideoHandler } = require("../controllers/videoController");

const router = express.Router();

router.post("/parse-video", parseVideoHandler);

module.exports = router;
