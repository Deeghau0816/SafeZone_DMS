const mongoose = require("mongoose");

const operationSchema = new mongoose.Schema({
  operationName: {
    type: String,
    required: [true, "Operation name is required"],
    trim: true,
    maxlength: [100, "Operation name cannot exceed 100 characters"]
  },
  volunteerCount: {
    type: Number,
    required: [true, "Volunteer count is required"],
    min: [1, "Volunteer count must be at least 1"]
  },
  status: {
    type: String,
    enum: ["active", "pending", "completed", "cancelled"],
    default: "pending"
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, "Location cannot exceed 100 characters"]
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  assignedVolunteers: [{
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer"
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This will automatically manage createdAt and updatedAt
});

// Index for better query performance
operationSchema.index({ status: 1, createdAt: -1 });
operationSchema.index({ operationName: 1 });

// Virtual for assigned volunteer count
operationSchema.virtual('assignedVolunteerCount').get(function() {
  return this.assignedVolunteers ? this.assignedVolunteers.length : 0;
});

// Virtual for remaining volunteer slots
operationSchema.virtual('remainingSlots').get(function() {
  const assigned = this.assignedVolunteers ? this.assignedVolunteers.length : 0;
  return Math.max(0, this.volunteerCount - assigned);
});

// Include virtuals when converting to JSON
operationSchema.set('toJSON', { virtuals: true });
operationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Operation", operationSchema);