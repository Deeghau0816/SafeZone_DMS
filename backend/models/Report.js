// models/Report.js
const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    district: { type: String, index: true },
    category: { type: String },
    severity: { type: String, enum: ["Low", "Moderate", "High", "Critical"] },
    status: {
      type: String,
      enum: ["Open", "In-Progress", "Resolved", "Rejected"],
      default: "Open",
    },
    reporterName: { type: String },
    reporter: {
      name: String,
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
