const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const activeDisasterController = require('../Controllers/ActiveDisasterControllers');

const router = express.Router();

//  Safe CSV processing function
function processNeeds(needs) {
  if (!needs || needs === undefined || needs === null) return [];
  if (typeof needs !== 'string') return [];
  return needs.split(',').map(n => n.trim()).filter(n => n);
}

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!require('fs').existsSync(uploadDir)) {
  require('fs').mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for disaster images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Configure multer fields for disaster creation
const uploadFields = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]);

// Configure multer fields for disaster update (with specific gallery slots)
const uploadUpdateFields = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'gallery_0', maxCount: 1 },
  { name: 'gallery_1', maxCount: 1 },
  { name: 'gallery_2', maxCount: 1 },
  { name: 'gallery_3', maxCount: 1 }
]);

// Routes
router.get('/', activeDisasterController.list);
router.get('/:id', activeDisasterController.getById);
router.post('/', uploadFields, activeDisasterController.create);
router.delete('/:id', activeDisasterController.remove);

// UPDATED PUT ROUTE - handles showOnDonation toggle properly without affecting images
router.put('/:id', uploadUpdateFields, async (req, res) => {
  try {
    const { 
      name, city, summary, needs, accentColor, severity, active, showOnDonation,
      finalGallery, removedImages 
    } = req.body;
    
    console.log('Toggle update - showOnDonation:', showOnDonation);
    
    // If this is just a simple toggle update (no file data), handle it directly
    if (!finalGallery && !removedImages && Object.keys(req.files || {}).length === 0) {
      console.log('Simple toggle update detected');
      
      // Use the existing controller's update method for toggle-only updates
      const processedReq = {
        ...req,
        body: {
          ...req.body,
          needs: processNeeds(needs),
          active: active === 'true' || active === true,
          showOnDonation: showOnDonation === 'true' || showOnDonation === true
        }
      };
      
      return await activeDisasterController.update(processedReq, res);
    }
    
    // Handle full update with image changes
    const gallery = JSON.parse(finalGallery || '[]');
    const toRemove = JSON.parse(removedImages || '[]');
    
    console.log('Processing full update:', { gallery, toRemove, files: req.files });
    
    // Build the final gallery array
    const processedGallery = [];
    
    for (let i = 0; i < 4; i++) {
      if (gallery[i] === `NEW_FILE_${i}` && req.files[`gallery_${i}`]) {
        // New file uploaded for this slot
        processedGallery[i] = `/uploads/${req.files[`gallery_${i}`][0].filename}`;
      } else if (gallery[i] && gallery[i] !== null && !gallery[i].startsWith('NEW_FILE_')) {
        // Keep existing image (not removed)
        processedGallery[i] = gallery[i];
      }
      // If gallery[i] is null or undefined, we don't add anything (slot remains empty)
    }
    
    // Clean up removed image files from filesystem
    if (toRemove.length > 0) {
      for (const imagePath of toRemove) {
        try {
          // Convert relative path to absolute path
          const fullPath = path.join(__dirname, '../', imagePath);
          await fs.unlink(fullPath);
          console.log('Deleted file:', fullPath);
        } catch (unlinkError) {
          console.warn('Could not delete file:', imagePath, unlinkError.message);
        }
      }
    }
    
    // Filter out null/undefined values for storage
    const cleanGallery = processedGallery.filter(img => img && img !== null);
    
    // Use the existing controller's update method, but pass processed data
    const processedReq = {
      ...req,
      body: {
        ...req.body,
        needs: processNeeds(needs),
        active: active === 'true' || active === true,
        showOnDonation: showOnDonation === 'true' || showOnDonation === true,
        processedGallery: cleanGallery
      }
    };
    
    // Call the existing update method
    await activeDisasterController.update(processedReq, res);
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update disaster'
    });
  }
});

module.exports = router;