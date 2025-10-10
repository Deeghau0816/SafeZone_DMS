const DistributionRecord = require('../models/DistributionrecordModel');

// ================== CREATE ==================
const createDistributionRecord = async (req, res) => {
  try {
    const { familiesAssisted, resourcesDistributed } = req.body;

    // Convert & validate numbers
    const familiesNum = Number(familiesAssisted);
    const resourcesNum = Number(resourcesDistributed);

    if (isNaN(familiesNum) || familiesNum < 0) {
      return res.status(400).json({ message: "familiesAssisted must be a valid non-negative number" });
    }
    if (isNaN(resourcesNum) || resourcesNum < 0) {
      return res.status(400).json({ message: "resourcesDistributed must be a valid non-negative number" });
    }
    if (resourcesNum > familiesNum) {
      return res.status(400).json({ message: "resourcesDistributed cannot exceed familiesAssisted" });
    }

    const newRecord = new DistributionRecord({
      familiesAssisted: familiesNum,
      resourcesDistributed: resourcesNum,
    });

    await newRecord.save();

    return res.status(201).json({
      message: "Distribution record created successfully",
      data: newRecord,
    });
  } catch (error) {
    console.error("Error creating distribution record:", error);
    return res.status(500).json({
      message: "Error creating distribution record",
      error: error.message,
    });
  }
};

// ================== READ ALL ==================
const getAllDistributionRecords = async (req, res) => {
  try {
    const records = await DistributionRecord.find().sort({ timestamp: -1 });
    return res.status(200).json({
      message: "Distribution records fetched successfully",
      data: records,
      count: records.length,
    });
  } catch (error) {
    console.error("Error fetching distribution records:", error);
    return res.status(500).json({
      message: "Error fetching distribution records",
      error: error.message,
    });
  }
};

// ================== READ ONE ==================
const getDistributionRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DistributionRecord.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Distribution record not found" });
    }
    return res.status(200).json({
      message: "Distribution record fetched successfully",
      data: record,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid record ID format" });
    }
    console.error("Error fetching distribution record:", error);
    return res.status(500).json({
      message: "Error fetching the record",
      error: error.message,
    });
  }
};

// ================== UPDATE ==================
const updateDistributionRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { familiesAssisted, resourcesDistributed } = req.body;

    const familiesNum = Number(familiesAssisted);
    const resourcesNum = Number(resourcesDistributed);

    if (isNaN(familiesNum) || familiesNum < 0) {
      return res.status(400).json({ message: "familiesAssisted must be a valid non-negative number" });
    }
    if (isNaN(resourcesNum) || resourcesNum < 0) {
      return res.status(400).json({ message: "resourcesDistributed must be a valid non-negative number" });
    }
    if (resourcesNum > familiesNum) {
      return res.status(400).json({ message: "resourcesDistributed cannot exceed familiesAssisted" });
    }

    const updatedRecord = await DistributionRecord.findByIdAndUpdate(
      id,
      { familiesAssisted: familiesNum, resourcesDistributed: resourcesNum },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: "Distribution record not found" });
    }

    return res.status(200).json({
      message: "Distribution record updated successfully",
      data: updatedRecord,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid record ID format" });
    }
    console.error("Error updating distribution record:", error);
    return res.status(500).json({
      message: "Error updating distribution record",
      error: error.message,
    });
  }
};

// ================== DELETE ==================
const deleteDistributionRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await DistributionRecord.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ message: "Distribution record not found" });
    }

    return res.status(200).json({
      message: "Distribution record deleted successfully",
      data: deletedRecord,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid record ID format" });
    }
    console.error("Error deleting distribution record:", error);
    return res.status(500).json({
      message: "Error deleting distribution record",
      error: error.message,
    });
  }
};

// ================== TEST ENDPOINT ==================
const testEndpoint = (req, res) => {
  return res.json({
    message: "Test endpoint working",
    body: req.body,
    headers: req.headers,
    contentType: req.get("Content-Type"),
  });
};

module.exports = {
  createDistributionRecord,
  getAllDistributionRecords,
  getDistributionRecordById,
  updateDistributionRecord,
  deleteDistributionRecord,
  testEndpoint,
};
