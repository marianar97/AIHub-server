// src/routes/testRoute.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/test-db", async (req, res) => {
  try {
    // Check if we're connected
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database not connected");
    }

    const dbStatus = mongoose.connection.readyState;
    const statusMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const dbInfo = {
      connectionStatus: statusMap[dbStatus],
      databaseName: mongoose.connection.db.databaseName,
      host: mongoose.connection.host,
    };

    // Only try to list collections if we're connected
    if (dbStatus === 1) {
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      dbInfo.collections = collections.map((c) => c.name);
    }

    res.json({
      success: true,
      message: "Database connection test",
      data: dbInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection test failed",
      error: error.message,
      connectionState: mongoose.connection.readyState,
    });
  }
});

module.exports = router;
