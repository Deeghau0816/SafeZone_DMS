// Routes/DamageRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const ctrl = require("../Controllers/DamageController");

// ensure upload dir exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "damage");
const fs = require("fs");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage: unique filename to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // create unique filename: timestamp-random-ext
    const rnd = crypto.randomBytes(6).toString("hex");
    const safe = file.originalname.replace(/\s+/g, "_");
    const name = `${Date.now()}-${rnd}-${safe}`;
    cb(null, name);
  }
});

// file size and quantity limits (adjust if you want)
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 }, // 50MB max per file, up to 10 files
});

// endpoints:
// POST /damage  (multipart/form-data) field "attachments" can be multiple files
router.post("/", upload.array("attachments", 10), ctrl.createDamage);
router.get("/",  ctrl.listDamages);
router.get("/:id", ctrl.getDamage);
router.put("/:id", upload.array("attachments", 10), ctrl.updateDamage);
router.delete("/:id", ctrl.deleteDamage);

module.exports = router;
