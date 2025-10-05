// Model/SystemState.js
const mongoose = require("mongoose");

const systemStateSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("SystemState", systemStateSchema);
