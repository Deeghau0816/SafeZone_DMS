// Model/DamageModel.js
const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },      // stored filename on disk
  originalName: { type: String, required: true },  // original client filename
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },          // bytesssss
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const DamageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nic: { type: String, required: true, trim: true, match: /^(\d{9}[VvXx]|\d{12})$/ },
    postalCode: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true, match: /^(?:\+94|0)?7\d{8}$/ },
    address: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    attachments: { type: [AttachmentSchema], default: [] },

    damageType: {
      type: String,
      required: true,
      enum: ["Flood", "Earthquake", "Landslide", "Storm", "Fire", "Collision", "Other"],
    },

    estimatedLoss: {
      type: Number,
      required: true,
      min: 0,
    },

    // Date + time when damage occurred
    occurredAt: { type: Date, required: true, index: true },

    // Could be "lat,lng" or textual place
    currentLocation: { type: String, required: true, trim: true },

    // Action tracking fields
    actionStatus: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "completed"],
      default: "pending"
    },
    
    actionTakenBy: { type: String, trim: true }, // Admin/user who took action
    actionDate: { type: Date },
    actionNotes: { type: String, trim: true },
    actionType: { type: String, trim: true }, // Type of action taken
    
    // Financial processing
    financialStatus: {
      type: String,
      enum: ["not_sent", "sent_to_financial", "processing", "approved", "paid"],
      default: "not_sent"
    },
    financialAmount: { type: Number, min: 0 },
    financialNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Damage", DamageSchema);
