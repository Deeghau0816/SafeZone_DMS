// backend/Model/ActiveDisasterModel.js
const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema(
  {
    cover: { type: String, default: "" },        // "/uploads/xxx.jpg"
    gallery: { type: [String], default: [] }     // up to 4 imagess now
  },
  { _id: false }
);

const ActiveDisasterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    needs: { type: [String], default: [] },      // e.g. ["Water","Food"]
    accentColor: { type: String, default: "#16a34a" },
    severity: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    active: { type: Boolean, default: true },
    showOnDonation: { type: Boolean, default: true },
    images: { type: ImageSchema, default: () => ({}) }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActiveDisaster", ActiveDisasterSchema);