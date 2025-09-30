// Model/DamageModel.js
const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },      // stored filename on disk
  originalName: { type: String, required: true },  // original client filename
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },          // bytes
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Damage", DamageSchema);
