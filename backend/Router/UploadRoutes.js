// backend/Routes/uploadRoutes.jsn
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Destination for uploaded files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Unique filename
    const ext = path.extname(file.originalname); // File extension
    cb(null, file.fieldname + '-' + uniqueSuffix + ext); // Save the file with unique name
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) { // Only allow images
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Single file upload endpoint
router.post('/deposit-proof', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = '/uploads/' + req.file.filename; // Generate the file URL
    res.json({
      url: fileUrl, // URL to access the uploaded file
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
});

// Multiple file upload endpoint (if needed)
router.post('/multiple', upload.array('files', 10), (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const fileUrls = req.files.map(file => ({
      url: '/uploads/' + file.filename,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size
    }));
    
    res.json({ files: fileUrls });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
