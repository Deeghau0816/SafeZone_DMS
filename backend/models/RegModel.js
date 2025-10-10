// Model/RegModel.js
const mongoose = require("mongoose");

const regSchema = new mongoose.Schema(
  {
    firstName:     { type: String, required: true, trim: true },
    lastName:      { type: String, required: true, trim: true },
    nic:           { type: String, required: true, trim: true },

    // keep unique constraint; email is stored lowercase
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },

    contactNumber: { type: String, required: true, trim: true },

    district: {
      type: String,
      required: true,
      enum: [
        "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha","Hambantota",
        "Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala","Mannar","Matale","Matara",
        "Monaragala","Mullaitivu","Nuwara Eliya","Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya",
      ],
      trim: true,
    },

    city:        { type: String, required: true, trim: true },
    postalCode:  { type: String, required: true, trim: true },

    // password is not selected by default for safety
    password:    { type: String, required: true, select: false },

    // 🔔 optional alert prefs
    emailAlerts:   { type: Boolean, default: true },
    lastAlertHash: { type: String, default: "" },
    lat:           { type: Number },
    lon:           { type: Number },
  },
  { timestamps: true, versionKey: false }
);

// Ensure a proper unique index on email (lowercased)
regSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", regSchema);
