// backend/Controllers/TargetinventoryController.js
const TargetInventory = require("../Model/TargetinventoryModel");

/**
 * GET current targets
 */
exports.getTargets = async (req, res) => {
  try {
    const targets = await TargetInventory.findOne().lean();
    
    if (!targets) {
      // Return default structure if no targets exist
      const defaultTargets = {
        dry_rations: 0,
        water: 0,
        bedding: 0,
        medical: 0,
        clothing: 0,
        hygiene: 0
      };
      return res.json(defaultTargets);
    }
    
    // Remove MongoDB fields and return clean data
    const { _id, createdAt, updatedAt, __v, ...cleanTargets } = targets;
    res.json(cleanTargets);
    
  } catch (err) {
    console.error("Error fetching targets:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch targets",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * POST/PUT update targets
 */
exports.setTargets = async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate input
    const allowedFields = ['dry_rations', 'water', 'bedding', 'medical', 'clothing', 'hygiene'];
    const validUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && typeof value === 'number' && value >= 0) {
        validUpdates[key] = value;
      }
    }
    
    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid target updates provided"
      });
    }
    
    // Use findOneAndUpdate with upsert
    const updatedTargets = await TargetInventory.findOneAndUpdate(
      {}, // Empty filter to match the single document
      { $set: validUpdates },
      { 
        upsert: true, 
        new: true, 
        runValidators: true,
        lean: true 
      }
    );
    
    const { _id, createdAt, updatedAt, __v, ...cleanTargets } = updatedTargets;
    
    res.json({ 
      success: true, 
      message: "Targets updated successfully", 
      data: cleanTargets 
    });
    
  } catch (err) {
    console.error("Error saving targets:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to save targets",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * GET targets with metadata (for admin dashboard)
 */
exports.getTargetsWithMeta = async (req, res) => {
  try {
    const targets = await TargetInventory.findOne();
    
    if (!targets) {
      return res.json({
        success: true,
        data: null,
        message: "No targets configured yet"
      });
    }
    
    res.json({
      success: true,
      data: {
        targets: {
          dry_rations: targets.dry_rations,
          water: targets.water,
          bedding: targets.bedding,
          medical: targets.medical,
          clothing: targets.clothing,
          hygiene: targets.hygiene
        },
        lastUpdated: targets.updatedAt,
        created: targets.createdAt
      }
    });
    
  } catch (err) {
    console.error("Error fetching targets with metadata:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch targets with metadata" 
    });
  }
};