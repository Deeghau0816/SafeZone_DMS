// Controlers/RegControl.js
const User = require("../models/RegModel");

// GET: all users
const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().lean();
    return res.status(200).json({ ok: true, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ ok: false, message: "Server error while fetching users" });
  }
};

// GET: user by id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("Error finding user by ID:", err);
    return res.status(500).json({ ok: false, message: "Server error while retrieving user" });
  }
};

//  update user 
const updateUser = async (req, res) => {
  try {
    const updateData = {
      firstName:     req.body.firstName,
      lastName:      req.body.lastName,
      nic:           req.body.nic,
      email:         req.body.email,
      contactNumber: req.body.contactNumber,
      district:      req.body.district,
      city:          req.body.city,
      postalCode:    req.body.postalCode,
    };

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ ok: false, message: "User not found for update" });
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({ ok: false, message: "Failed to update user" });
  }
};

// DELETE: delete user
const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.userId);
    if (!deleted) return res.status(404).json({ ok: false, message: "User not found for deletion" });
    return res.status(200).json({ ok: true, message: "User deleted successfully." });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ ok: false, message: "Failed to delete user" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
