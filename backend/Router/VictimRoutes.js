// routes/victims.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const VictimController = require('../Controllers/VictimControllers');

const router = express.Router();

/* ---------- ensure /uploads exists ---------- */
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* ---------- Multer config (images + video, max 2 files) ---------- */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = (file.originalname || 'file')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm'
]);

// Reject unsupported types with a clear error
const fileFilter = (_req, file, cb) => {
  if (ALLOWED.has(file.mimetype)) return cb(null, true);
  const err = new Error('UNSUPPORTED_FILE_TYPE');
  err.statusCode = 400;
  return cb(err);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB per file
    files: 2                     // <= TWO attachments
  }
});

/* ---------------- Routes ---------------- */
router.get('/', VictimController.getAllVictims);
router.get('/:id', VictimController.getVictimById);

// multipart/form-data: use field name "media" (up to 2 files)
router.post('/', upload.array('media', 2), VictimController.addVictims);
router.put('/:id', upload.array('media', 2), VictimController.updateVictim);

// quick current location updates (no files)
router.patch('/:id/location', VictimController.updateLocation);

router.delete('/:id', VictimController.deleteVictim);

/* ---------- Multer / upload error handler (scoped to this router) ---------- */
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large (max 25MB per file)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files (max 2 attachments)' });
    }
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  if (err && err.message === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(err.statusCode || 400).json({
      message: 'Unsupported file type. Allowed: JPEG, PNG, WEBP, AVIF, MP4, MOV, WEBM.'
    });
  }
  return next(err);
});

module.exports = router;
