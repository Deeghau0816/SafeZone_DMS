const Pin = require("../models/pin");

class PinController {
  // Helper function to validate required pin data
  static validatePinData(place, disaster, info, createdBy, latitude, longitude) {
    const errors = [];
    
    // Validate required fields
    if (!place || !disaster || !info || !createdBy) {
      errors.push("Place, disaster, info, and createdBy are required");
    }
    
    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      errors.push("Valid latitude and longitude are required");
    }
    
    return errors;
  }

  // Helper function to validate image file sizes
  static validateImageSizes(files) {
    const errors = [];
    if (!files || !Array.isArray(files)) return errors;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1024 * 1024) { // 1MB in bytes
        errors.push(`Image file ${i + 1} is too large. Maximum size allowed is 1MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      }
    }
    return errors;
  }

  // Helper function to validate video file sizes
  static validateVideoSizes(files) {
    const errors = [];
    if (!files || !Array.isArray(files)) return errors;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) { // 15MB in bytes
        errors.push(`Video file ${i + 1} is too large. Maximum size allowed is 15MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      }
    }
    return errors;
  }

  // Helper function to format files for storage
  static formatFiles(files) {
    if (!files || !Array.isArray(files)) return [];
    return files.map((file) => ({
      data: file.buffer,
      contentType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    }));
  }

  // Helper function to build pagination response
  static buildPagination(currentPage, limit, total, data) {
    const totalPages = Math.ceil(total / parseInt(limit));
    const skip = (parseInt(currentPage) - 1) * parseInt(limit);
    
    return {
      currentPage: parseInt(currentPage),
      totalPages,
      totalPins: total,
      hasNext: skip + data.length < total,
      hasPrev: parseInt(currentPage) > 1
    };
  }
  // Get all pins
  static async getAllPins(req, res) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const pins = await Pin.find()
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Pin.countDocuments();

      res.json({
        success: true,
        data: pins,
        pagination: PinController.buildPagination(page, limit, total, pins)
      });
    } catch (error) {
      console.error("Get pins error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching pins" 
      });
    }
  }

  // Get pin by ID
  static async getPinById(req, res) {
    try {
      const { id } = req.params;
      
      const pin = await Pin.findById(id);
      
      if (!pin) {
        return res.status(404).json({ 
          success: false,
          message: "Pin not found" 
        });
      }
      
      res.json({
        success: true,
        data: pin
      });
    } catch (error) {
      console.error("Get pin by ID error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching pin" 
      });
    }
  }

  // Get nearby pins
  static async getNearbyPins(req, res) {
    try {
      const { longitude, latitude, distance = 10000 } = req.query; // radius in meters

      if (!longitude || !latitude) {
        return res.status(400).json({ 
          success: false,
          message: "Longitude and latitude are required" 
        });
      }

      const nearbyPins = await Pin.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: parseFloat(distance),
          },
        },
      });

      res.json({
        success: true,
        data: nearbyPins,
        count: nearbyPins.length
      });
    } catch (error) {
      console.error("Get nearby pins error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching nearby pins" 
      });
    }
  }

  // Create new pin
  static async createPin(req, res) {
    try {
      const pinData = {
        place: req.body.place,
        disaster: req.body.disaster,
        info: req.body.info,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        createdBy: req.body.createdBy,
        severity: req.body.severity || "Moderate",
        location: {
          type: "Point",
          coordinates: [
            parseFloat(req.body.longitude),
            parseFloat(req.body.latitude),
          ],
        },
        images: [],
        videos: [],
      };

      // Validation using helper functions
      console.log("Pin creation request body:", req.body);
      console.log("Pin creation files:", req.files);
      
      const validationErrors = PinController.validatePinData(
        pinData.place, 
        pinData.disaster, 
        pinData.info, 
        pinData.createdBy, 
        pinData.latitude, 
        pinData.longitude
      );
      if (validationErrors.length > 0) {
        console.log("Validation errors:", validationErrors);
        return res.status(400).json({ 
          success: false,
          message: validationErrors[0] // Return first error for consistency
        });
      }

      // Validate file sizes using helper functions
      const imageErrors = PinController.validateImageSizes(req.files?.images);
      if (imageErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: imageErrors[0]
        });
      }

      const videoErrors = PinController.validateVideoSizes(req.files?.videos);
      if (videoErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: videoErrors[0]
        });
      }

      // Format files using helper function
      pinData.images = PinController.formatFiles(req.files?.images);
      pinData.videos = PinController.formatFiles(req.files?.videos);

      const newPin = new Pin(pinData);
      const savedPin = await newPin.save();

      res.status(201).json({
        success: true,
        message: "Pin created successfully",
        data: savedPin
      });
    } catch (error) {
      console.error("Create pin error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while creating pin" 
      });
    }
  }

  // Update pin
  static async updatePin(req, res) {
    try {
      const { id } = req.params;
      
      const existingPin = await Pin.findById(id);
      if (!existingPin) {
        return res.status(404).json({ 
          success: false,
          message: "Pin not found" 
        });
      }

      const updateData = {
        place: req.body.place || existingPin.place,
        disaster: req.body.disaster || existingPin.disaster,
        info: req.body.info || existingPin.info,
        createdBy: req.body.createdBy || existingPin.createdBy,
        severity: req.body.severity || existingPin.severity,
        latitude: req.body.latitude
          ? parseFloat(req.body.latitude)
          : existingPin.latitude,
        longitude: req.body.longitude
          ? parseFloat(req.body.longitude)
          : existingPin.longitude,
      };

      updateData.location = {
        type: "Point",
        coordinates: [updateData.longitude, updateData.latitude],
      };

      // Validate file sizes using helper functions
      const imageErrors = PinController.validateImageSizes(req.files?.images);
      if (imageErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: imageErrors[0]
        });
      }

      const videoErrors = PinController.validateVideoSizes(req.files?.videos);
      if (videoErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: videoErrors[0]
        });
      }

      // Handle new uploaded files using helper function
      if (req.files?.images) {
        const newImages = PinController.formatFiles(req.files.images);
        updateData.images = [...existingPin.images, ...newImages];
      }

      if (req.files?.videos) {
        const newVideos = PinController.formatFiles(req.files.videos);
        updateData.videos = [...existingPin.videos, ...newVideos];
      }

      const updatedPin = await Pin.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Pin updated successfully",
        data: updatedPin
      });
    } catch (error) {
      console.error("Update pin error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while updating pin" 
      });
    }
  }

  // Delete pin
  static async deletePin(req, res) {
    try {
      const { id } = req.params;
      
      const pin = await Pin.findById(id);
      if (!pin) {
        return res.status(404).json({ 
          success: false,
          message: "Pin not found" 
        });
      }

      await Pin.findByIdAndDelete(id);
      
      res.json({ 
        success: true,
        message: "Pin deleted successfully" 
      });
    } catch (error) {
      console.error("Delete pin error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while deleting pin" 
      });
    }
  }

  // Delete specific file (image or video)
  static async deleteFile(req, res) {
    try {
      const { id, type, index } = req.params;

      const pin = await Pin.findById(id);
      if (!pin) {
        return res.status(404).json({ 
          success: false,
          message: "Pin not found" 
        });
      }

      const idx = parseInt(index, 10);
      if (Number.isNaN(idx)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid index" 
        });
      }

      if (type === "image") {
        if (!pin.images[idx]) {
          return res.status(404).json({ 
            success: false,
            message: "Image not found" 
          });
        }
        pin.images.splice(idx, 1);
      } else if (type === "video") {
        if (!pin.videos[idx]) {
          return res.status(404).json({ 
            success: false,
            message: "Video not found" 
          });
        }
        pin.videos.splice(idx, 1);
      } else {
        return res.status(400).json({ 
          success: false,
          message: "Invalid type; expected 'image' or 'video'" 
        });
      }

      await pin.save();

      res.json({ 
        success: true,
        message: "File deleted successfully",
        data: pin
      });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while deleting file" 
      });
    }
  }

  // Serve file binary by index/id and type
  static async serveFile(req, res) {
    try {
      const { id, fileIndex, type } = req.params;
      
      const pin = await Pin.findById(id);
      if (!pin) {
        return res.status(404).json({ 
          success: false,
          message: "Pin not found" 
        });
      }
      
      const index = parseInt(fileIndex, 10);
      const fileArray = type === 'image' ? pin.images : pin.videos;
      const file = fileArray[index];
      
      if (!file) {
        return res.status(404).json({ 
          success: false,
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` 
        });
      }
      
      res.set("Content-Type", file.contentType || "application/octet-stream");
      res.send(file.data);
    } catch (error) {
      console.error(`Serve ${req.params.type} error:`, error);
      res.status(500).json({ 
        success: false,
        message: `Server error while serving ${req.params.type}` 
      });
    }
  }

  // Search pins
  static async searchPins(req, res) {
    try {
      const { query, page = 1, limit = 10, disaster, severity } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let searchCriteria = {};
      
      if (query) {
        const searchRegex = new RegExp(query, 'i');
        searchCriteria.$or = [
          { place: searchRegex },
          { disaster: searchRegex },
          { info: searchRegex },
          { createdBy: searchRegex }
        ];
      }
      
      if (disaster) {
        searchCriteria.disaster = new RegExp(disaster, 'i');
      }
      
      if (severity) {
        searchCriteria.severity = severity;
      }
      
      const pins = await Pin.find(searchCriteria)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Pin.countDocuments(searchCriteria);

      res.json({
        success: true,
        data: pins,
        pagination: PinController.buildPagination(page, limit, total, pins)
      });
    } catch (error) {
      console.error("Search pins error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while searching pins" 
      });
    }
  }
}

module.exports = PinController;
