const mongoose = require("mongoose");

const PinSchema = new mongoose.Schema({
  place: { type: String, required: true },
  disaster: { type: String, required: true },
  info: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  createdBy: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ["Low", "Moderate", "High", "Critical"], 
    default: "Moderate",
    required: true 
  },
  


  // Media stored directly in MongoDB as binary buffers
  images: [{
    data: Buffer,
    contentType: String,
    originalName: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  }],
  videos: [{
    data: Buffer,
    contentType: String,
    originalName: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  }],

   location: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },


  createdAt: { type: Date, default: Date.now },
});

PinSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Pin", PinSchema);