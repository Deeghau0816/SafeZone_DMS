// backend/Controllers/CentersController.js
const Center = require("../models/CentersModel");

// Add a new center
exports.addCenter = async (req, res) => {
  try {
    const { name, address, city, phone, tags, hours, lat, lng } = req.body;
    const newCenter = new Center({ name, address, city, phone, tags, hours, lat, lng });
    await newCenter.save();
    res.status(201).json(newCenter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add center", error });
  }
};

// Get all centers
exports.getCenters = async (req, res) => {
  try {
    const centers = await Center.find();
    res.status(200).json(centers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve centers", error });
  }
};

// Get center by ID
exports.getCenterById = async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ message: "Center not found" });
    }
    res.status(200).json(center);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve center", error });
  }
};

// Update center by ID
exports.updateCenter = async (req, res) => {
  try {
    const { name, address, city, phone, tags, hours, lat, lng } = req.body;
    const updatedCenter = await Center.findByIdAndUpdate(
      req.params.id,
      { name, address, city, phone, tags, hours, lat, lng },
      { new: true }
    );
    if (!updatedCenter) {
      return res.status(404).json({ message: "Center not found" });
    }
    res.status(200).json(updatedCenter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update center", error });
  }
};

// Delete center by ID
exports.deleteCenter = async (req, res) => {
  try {
    const deletedCenter = await Center.findByIdAndDelete(req.params.id);
    if (!deletedCenter) {
      return res.status(404).json({ message: "Center not found" });
    }
    res.status(200).json({ message: "Center deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete center", error });
  }
};
