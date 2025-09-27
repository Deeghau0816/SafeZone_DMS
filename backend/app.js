const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const pinRouter = require("./Router/pins");
const contactRoutes = require("./Router/contact");
const shelterRoutes = require("./Router/shelters");
const multer = require("multer");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/pins", pinRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/shelters", shelterRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }
  res.status(500).json({ error: error.message });
});

// MongoDB connect
mongoose
  .connect(
    "mongodb+srv://Navod:BydFyOS6Ezof90nL@cluster0.oa0mfoh.mongodb.net/map?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(5000, () => console.log("Server running on port 5000"));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
