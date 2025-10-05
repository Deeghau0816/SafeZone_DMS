//  backend/Routes/DonationRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const {
  createDonation,
  listDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
  createDonationsBulk,
  sendThanksToday,
  sendThanksBatch,
} = require("../Controllers/DonationControllers");

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) =>
    cb(null, `evidence_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const fileFilter = (_, file, cb) => {
  const ok = ["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype);
  cb(ok ? null : new Error("Only PNG/JPG allowed"), ok);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// CRUD
router.get("/", listDonations);
router.post("/", upload.single("evidence"), createDonation);
router.post("/bulk", createDonationsBulk);

// WhatsApp thanks
router.post("/thanks/today", sendThanksToday);
router.post("/thanks/batch", sendThanksBatch);

// by id (after above routes)
router.get("/:id", getDonationById);
router.put("/:id", upload.single("evidence"), updateDonation);
router.delete("/:id", deleteDonation);

module.exports = router;
