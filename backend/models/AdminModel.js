const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    contactNumber: { type: String, required: true, trim: true, match: [/^[0-9+\-\s()]{7,20}$/, "Invalid contact number"] },
    adminName:     { type: String, required: true, enum: ["System Admin", "Disaster Management Officer", "Other"] },
    password:      { type: String, required: true, select: false }, 
  },
  { timestamps: true, versionKey: false }
);


adminSchema.set("toJSON", {
  transform(_doc, ret) { delete ret.password; return ret; }
});
adminSchema.set("toObject", {
  transform(_doc, ret) { delete ret.password; return ret; }
});

module.exports = mongoose.model("Admin", adminSchema);
