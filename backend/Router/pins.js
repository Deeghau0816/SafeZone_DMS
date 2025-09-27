const express = require("express");
const router = express.Router();
const multer = require("multer");
const PinController = require("../Controllers/PinController");

// Multer storage config - keep files in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  // Enforce <= 15MB per file to stay under MongoDB's 16MB document limit
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Middleware for file uploads
const uploadMiddleware = (req, res, next) => {
  const uploader = upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]);
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large. Max 15MB per file." });
      }
      return res.status(400).json({ error: err.message || "Upload error" });
    }
    next();
  });
};

// Pin routes
router.get("/", PinController.getAllPins);
router.get("/search", PinController.searchPins);
router.get("/nearby", PinController.getNearbyPins);
router.get("/:id", PinController.getPinById);
router.post("/", uploadMiddleware, PinController.createPin);
router.put("/:id", uploadMiddleware, PinController.updatePin);
router.delete("/:id", PinController.deletePin);
router.delete("/:id/file/:type/:index", PinController.deleteFile);
router.get("/:id/image/:fileIndex", (req, res) => PinController.serveFile({ ...req, params: { ...req.params, type: 'image' } }, res));
router.get("/:id/video/:fileIndex", (req, res) => PinController.serveFile({ ...req, params: { ...req.params, type: 'video' } }, res));

module.exports = router;