const mongoose = require("mongoose");

const AidSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nic: {
      type: String,
      required: true,
      trim: true,
      match: /^(\d{9}[VvXx]|\d{12})$/,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^(?:\+94|0)?7\d{8}$/,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    aidType: {
      type: String,
      required: true,
      enum: ["Food", "Water", "Shelter", "Medical", "Clothing", "Rescue"],
    },
    urgency: {
      type: String,
      default: "Normal",
      enum: ["Normal", "High", "Critical"],
    },
    description: { type: String, trim: true },
    requestedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Aid", AidSchema);
