// src/config/database.js
const mongoose = require("mongoose");
const config = require("./config");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB..."); // Debug log
    console.log(
      "Using URI:",
      config.mongoUri.replace(/\/\/[^:]+:[^@]+@/, "//<credentials>@")
    ); // Safe logging of URI

    const conn = await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("MongoDB Connected successfully!");
    return conn;
  } catch (error) {
    console.error("MongoDB Connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
