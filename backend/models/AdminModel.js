// models/AdminModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  adminName: {
    type: String,
    required: true,
    enum: ["System Admin", "Disaster Management Officer", "Other"],
  },
  // hidden by default; explicitly select with .select('+password')
  password:      { type: String, required: true, select: false, minlength: 6 },
}, { timestamps: true });

// Hash password automatically when modified/created
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);
