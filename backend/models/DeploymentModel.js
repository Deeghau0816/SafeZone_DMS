const mongoose = require("mongoose");

const DeploymentSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true },
    team: { type: String, enum: ["Army", "Police", "Fire Brigade"], required: true },
    teamName: { 
      type: String, 
      required: [true, "Team name is required"],
      trim: true,
      minlength: [1, "Team name cannot be empty"]
    },
    urgent: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    contact: { 
      type: String, 
      required: [true, "Contact number is required"],
      validate: {
        validator: function(v) {
          // Must be exactly 10 digits
          if (!/^[0-9]{10}$/.test(v)) {
            return false;
          }
          // Cannot be the same digit repeated 10 times
          if (/^(\d)\1{9}$/.test(v)) {
            return false;
          }
          return true;
        },
        message: props => {
          if (!/^[0-9]{10}$/.test(props.value)) {
            return "Contact must be exactly 10 digits";
          }
          if (/^(\d)\1{9}$/.test(props.value)) {
            return "Contact cannot be the same digit repeated 10 times";
          }
          return "Invalid contact number";
        }
      }
    },
    notes: { 
      type: String, 
      required: [true, "Deployment notes are required"],
      trim: true,
      minlength: [5, "Deployment notes must be at least 5 characters"]
    },
    specialInstructions: { 
      type: String, 
      required: [true, "Special instructions are required"],
      trim: true,
      minlength: [5, "Special instructions must be at least 5 characters"]
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deployment", DeploymentSchema);


