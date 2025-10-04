const mongoose = require("mongoose");

const RequestsSchema = new mongoose.Schema(
  {
    aidId: { type: String },
    org: { type: String, enum: ["Medical Teams", "NGO"], required: true },
    victim: { type: String, required: true },
    priority: { type: String, enum: ["High", "Medium", "Low", "Normal", "Critical"], default: "Medium" },
    resources: { 
      type: String, 
      required: [true, "Resource allocated is required"],
      trim: true,
      minlength: [1, "Resource allocated cannot be empty"]
    },
    contact: { 
      type: String, 
      required: [true, "DMO contact is required"],
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
    special: { 
      type: String, 
      required: [true, "Special instructions are required"],
      trim: true,
      minlength: [5, "Special instructions must be at least 5 characters"]
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", RequestsSchema);


