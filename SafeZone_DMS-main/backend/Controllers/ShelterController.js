const Shelter = require("../models/Shelter");

class ShelterController {
  // Helper function to validate shelter data
  static validateShelterData(name, description, latitude, longitude) {
    const errors = [];
    
    if (!name || !description) {
      errors.push("Name and description are required");
    }
    
    if (isNaN(latitude) || isNaN(longitude)) {
      errors.push("Valid latitude and longitude are required");
    }
    
    if (latitude < -90 || latitude > 90) {
      errors.push("Latitude must be between -90 and 90");
    }
    
    if (longitude < -180 || longitude > 180) {
      errors.push("Longitude must be between -180 and 180");
    }
    
    return errors;
  }

  // Get all shelters
  static async getAllShelters(req, res) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const shelters = await Shelter.find({ isActive: true })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Shelter.countDocuments({ isActive: true });

      res.json({
        success: true,
        data: shelters,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalShelters: total,
          hasNext: skip + shelters.length < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error("Get shelters error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching shelters" 
      });
    }
  }

  // Get shelter by ID
  static async getShelterById(req, res) {
    try {
      const { id } = req.params;
      
      const shelter = await Shelter.findById(id);
      
      if (!shelter) {
        return res.status(404).json({ 
          success: false,
          message: "Shelter not found" 
        });
      }
      
      res.json({
        success: true,
        data: shelter
      });
    } catch (error) {
      console.error("Get shelter by ID error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching shelter" 
      });
    }
  }

  // Get nearby shelters
  static async getNearbyShelters(req, res) {
    try {
      const { latitude, longitude, radius = 10000 } = req.query; // radius in meters, default 10km
      
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          success: false,
          message: "Latitude and longitude are required" 
        });
      }

      const shelters = await Shelter.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(radius)
          }
        },
        isActive: true
      }).limit(20);

      res.json({
        success: true,
        data: shelters
      });
    } catch (error) {
      console.error("Get nearby shelters error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while fetching nearby shelters" 
      });
    }
  }

  // Create a new shelter
  static async createShelter(req, res) {
    try {
      const { name, description, latitude, longitude, capacity, facilities, contact } = req.body;

      // Validation
      const errors = ShelterController.validateShelterData(name, description, latitude, longitude);
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: errors[0]
        });
      }

      const shelter = new Shelter({
        name,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        capacity: capacity || 0,
        facilities: facilities || [],
        contact: contact || {},
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      });

      await shelter.save();

      res.status(201).json({ 
        success: true,
        message: "Shelter created successfully", 
        data: shelter 
      });
    } catch (error) {
      console.error("Shelter creation error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while creating shelter" 
      });
    }
  }

  // Update shelter
  static async updateShelter(req, res) {
    try {
      const { id } = req.params;
      const { name, description, latitude, longitude, capacity, facilities, contact, isActive } = req.body;

      // Validation
      const errors = ShelterController.validateShelterData(name, description, latitude, longitude);
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: errors[0]
        });
      }

      const shelter = await Shelter.findByIdAndUpdate(
        id,
        { 
          name,
          description,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          capacity: capacity || 0,
          facilities: facilities || [],
          contact: contact || {},
          isActive: isActive !== undefined ? isActive : true,
          location: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          }
        },
        { new: true, runValidators: true }
      );

      if (!shelter) {
        return res.status(404).json({ 
          success: false,
          message: "Shelter not found" 
        });
      }

      res.json({
        success: true,
        message: "Shelter updated successfully",
        data: shelter
      });
    } catch (error) {
      console.error("Update shelter error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while updating shelter" 
      });
    }
  }

  // Delete shelter
  static async deleteShelter(req, res) {
    try {
      const { id } = req.params;
      
      const shelter = await Shelter.findByIdAndDelete(id);
      
      if (!shelter) {
        return res.status(404).json({ 
          success: false,
          message: "Shelter not found" 
        });
      }
      
      res.json({ 
        success: true,
        message: "Shelter deleted successfully" 
      });
    } catch (error) {
      console.error("Delete shelter error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while deleting shelter" 
      });
    }
  }

  // Search shelters
  static async searchShelters(req, res) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      
      if (!query) {
        return res.status(400).json({ 
          success: false,
          message: "Search query is required" 
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const searchRegex = new RegExp(query, 'i');
      const shelters = await Shelter.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { facilities: { $in: [searchRegex] } }
        ],
        isActive: true
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      const total = await Shelter.countDocuments({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { facilities: { $in: [searchRegex] } }
        ],
        isActive: true
      });

      res.json({
        success: true,
        data: shelters,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalShelters: total,
          hasNext: skip + shelters.length < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error("Search shelters error:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error while searching shelters" 
      });
    }
  }
}

module.exports = ShelterController;
