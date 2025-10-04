// backend/Model/CentersModel.js
const mongoose = require("mongoose");

const centerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    tags: { type: [String], default: [] },
    hours: { type: String, default: "" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { timestamps: true }
);

const Center = mongoose.model("Center", centerSchema);

module.exports = Center;
