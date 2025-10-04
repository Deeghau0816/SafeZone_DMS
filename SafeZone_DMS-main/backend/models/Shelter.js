const mongoose = require("mongoose");

const ShelterSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500
  },
  latitude: { 
    type: Number, 
    required: true,
    min: -90,
    max: 90
  },
  longitude: { 
    type: Number, 
    required: true,
    min: -180,
    max: 180
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0
  },
  facilities: [{
    type: String,
    trim: true
  }],
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  location: {
    type: { 
      type: String, 
      enum: ["Point"], 
      required: true, 
      default: "Point" 
    },
    coordinates: { 
      type: [Number], 
      required: true 
    }, // [longitude, latitude]
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create 2dsphere index for geospatial queries
ShelterSchema.index({ location: "2dsphere" });

// Update the updatedAt field before saving
ShelterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Shelter", ShelterSchema);
