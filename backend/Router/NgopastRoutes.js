const express = require("express");
const multer = require("multer");
const path = require("path");
const { 
  createRecord, 
  getAllRecords,
  updateRecord,
  deleteRecord
} = require("../Controllers/NgopastControllers");

const router = express.Router();

//  Multer config (uploads folder inside backend)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Routes
router.post("/", upload.array("images", 2), createRecord);
router.get("/", getAllRecords);
router.put("/:id", upload.array("images", 2), updateRecord);
router.delete("/:id", deleteRecord);

module.exports = router;