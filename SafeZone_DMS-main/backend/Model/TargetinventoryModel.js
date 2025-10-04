const mongoose = require("mongoose");

const TargetInventorySchema = new mongoose.Schema(
  {
    dry_rations: { type: Number, default: 0 },
    water: { type: Number, default: 0 },
    bedding: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    clothing: { type: Number, default: 0 },
    hygiene: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TargetInventory", TargetInventorySchema);
