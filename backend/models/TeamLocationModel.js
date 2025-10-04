const mongoose = require("mongoose");

const teamLocationSchema = new mongoose.Schema(
  {
    deploymentId: {
      type: String,
      required: true,
    },
    team: {
      type: String,
      required: true,
      enum: ["Army", "Police", "Fire Brigade"],
    },
    teamName: {
      type: String,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    lastUpdated: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// Create a unique index on deploymentId to ensure one location per deployment
teamLocationSchema.index({ deploymentId: 1 }, { unique: true });

module.exports = mongoose.model("TeamLocation", teamLocationSchema);
