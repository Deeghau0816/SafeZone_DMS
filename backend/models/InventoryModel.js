const mongoose = require("mongoose");

// Keys must match what frontend sends (enum-safe)
const ALLOWED_ITEMS = [
  "dry_rations",
  "water",
  "bedding",
  "medical",
  "clothing",
  "hygiene",
];

const InventorySchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: true,
      enum: ALLOWED_ITEMS, // enforce keys, not labels
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
    },
    unit: { type: String, required: true, trim: true }, 
    branch: { type: String, required: true, trim: true },
    date: { type: Date },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", InventorySchema);
