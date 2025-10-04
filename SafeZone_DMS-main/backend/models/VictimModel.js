// Model/VictimModel.js
// Mongoose model for disaster victim reports with media + geolocation
const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema(
  {
    filename: { type: String },
    url:      { type: String },   // absolute URL served from /uploads/<file>
    mimetype: { type: String },
    size:     { type: Number }    // bytes
  },
  { _id: false }
);

const VictimSchema = new mongoose.Schema(
  {
    // Reporter / victim basics
    name: {
      type: String,
      required: [true, 'Reporter name is required'],
      trim: true,
      match: [/^[A-Za-z\s]+$/, 'Name must contain letters and spaces only']
    },

    // NIC: string so we can support 9-digit + V/X and preserve leading zeros
    nic: {
      type: String,
      required: [true, 'NIC is required'],
      trim: true,
      set: v => (v || '').toUpperCase(),
      match: [/^(?:\d{12}|\d{9}[VX])$/, 'NIC must be 123456789V or 200012345678']
    },

    // Email is optional, but validate if provided
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
      required: false
    },

    // Phone: store full E.164-like (e.g., +94XXXXXXXXX); validated in controller
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true
    },

    address: {
      type: String,
      required: [true, 'Home address is required'],
      trim: true
    },

    description: {
      type: String,
      trim: true // optional
    },

    // Disaster type (align with UI options)
    disasterType: {
      type: String,
      required: [true, 'Disaster type is required'],
      trim: true,
      enum: ['Flood', 'Storm', 'Landslide', 'Fire', 'Earthquake', 'Other']
    },

    // Legacy single image (kept for backward-compat)
    image: { type: String },

    // Multiple attachments (images/videos)
    media: { type: [MediaSchema], default: [] },

    // Risk status ONLY (render as colored dot in UI)
    // Allowed: High | Medium | Low
    status: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
      required: true
    },

    // When the incident occurred (optional)
    occurredAt: { type: Date },

    // GeoJSON location ([lng, lat]) for geospatial queries
    // Do NOT default to [0,0]; controller already enforces presence on create
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number] // [lng, lat]
        // no default – must be provided by controller
      }
    },

    // Original created date (kept for compatibility)
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Geospatial index for $near queries
VictimSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('VictimModel', VictimSchema);
