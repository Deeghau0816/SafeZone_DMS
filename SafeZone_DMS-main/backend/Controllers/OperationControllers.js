// backend/Controllers/OperationControllers.js
const OperationModel = require("../Model/OperationModel");

const ALLOWED_STATUS = ["pending", "active", "completed", "cancelled"];
const TL_KEYS = [
  "teamAssigned",
  "vehicleLoaded",
  "enRoute",
  "checkpointVerified",
  "distributionStart",
  "returnReport",
];

/** Ensure timeline only contains allowed keys with 'pending' | 'done' */
function sanitizeTimeline(input) {
  if (!input || typeof input !== "object") return undefined;
  const out = {};
  for (const k of TL_KEYS) {
    const v = String(input[k] ?? "").toLowerCase();
    if (v === "pending" || v === "done") out[k] = v;
  }
  // if nothing valid provided, return undefined so we don't overwrite
  return Object.keys(out).length ? out : undefined;
}

/* ------------------------- Create ------------------------- */
const createOperation = async (req, res) => {
  try {
    let { operationName, volunteerCount, status, description, location, timeline } = req.body;

    if (!operationName || volunteerCount === undefined) {
      return res
        .status(400)
        .json({ message: "Operation name and volunteer count are required" });
    }

    operationName = String(operationName).trim();
    const vc = Number(volunteerCount);

    if (!operationName) {
      return res.status(400).json({ message: "Operation name is required" });
    }
    if (!Number.isFinite(vc) || vc < 1) {
      return res
        .status(400)
        .json({ message: "Volunteer count must be greater than 0" });
    }

    const doc = {
      operationName,
      volunteerCount: vc,
    };

    if (status && ALLOWED_STATUS.includes(String(status).toLowerCase())) {
      doc.status = String(status).toLowerCase();
    }
    if (description) doc.description = String(description).trim();
    if (location) doc.location = String(location).trim();

    const tl = sanitizeTimeline(timeline);
    if (tl) doc.timeline = tl;

    const savedOperation = await new OperationModel(doc).save();

    return res
      .status(201)
      .json({ message: "Operation created successfully", data: savedOperation });
  } catch (error) {
    console.error("Error creating operation:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

/* ------------------------- Read all ------------------------- */
const getOperations = async (_req, res) => {
  try {
    const operations = await OperationModel.find().sort({ createdAt: -1 });
    return res
      .status(200)
      .json({ message: "Operations retrieved successfully", count: operations.length, data: operations });
  } catch (error) {
    console.error("Error fetching operations:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

/* ------------------------- Read one ------------------------- */
const getOperationById = async (req, res) => {
  try {
    const { id } = req.params;
    const operation = await OperationModel.findById(id);
    if (!operation) return res.status(404).json({ message: "Operation not found" });
    return res.status(200).json({ message: "Operation retrieved successfully", data: operation });
  } catch (error) {
    console.error("Error fetching operation:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

/* ------------------------- Update (PATCH) ------------------------- */
const updateOperation = async (req, res) => {
  try {
    const { id } = req.params;
    let { operationName, volunteerCount, status, description, location, timeline } = req.body;

    const update = {};

    if (typeof operationName === "string") {
      operationName = operationName.trim();
      if (operationName) update.operationName = operationName;
    }

    if (volunteerCount !== undefined) {
      const vc = Number(volunteerCount);
      if (!Number.isFinite(vc) || vc < 1) {
        return res
          .status(400)
          .json({ message: "Volunteer count must be greater than 0" });
      }
      update.volunteerCount = vc;
    }

    if (status !== undefined) {
      const s = String(status).toLowerCase();
      if (!ALLOWED_STATUS.includes(s)) {
        return res.status(400).json({
          message: "Invalid status. Allowed: pending, active, completed, cancelled",
        });
      }
      update.status = s;
    }

    if (typeof description === "string") {
      update.description = description.trim();
    }

    if (typeof location === "string") {
      update.location = location.trim();
    }

    const tl = sanitizeTimeline(timeline);
    if (tl) update.timeline = tl;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    update.updatedAt = new Date();

    const updatedOperation = await OperationModel.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!updatedOperation)
      return res.status(404).json({ message: "Operation not found" });

    return res
      .status(200)
      .json({ message: "Operation updated successfully", data: updatedOperation });
  } catch (error) {
    console.error("Error updating operation:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

/* ------------------------- Delete ------------------------- */
const deleteOperation = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOperation = await OperationModel.findByIdAndDelete(id);
    if (!deletedOperation)
      return res.status(404).json({ message: "Operation not found" });
    return res
      .status(200)
      .json({ message: "Operation deleted successfully", data: deletedOperation });
  } catch (error) {
    console.error("Error deleting operation:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

/* ------------------------- Timeline Methods ------------------------- */

// Update specific timeline step
const updateTimelineStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { step, status } = req.body;

    if (!TL_KEYS.includes(step)) {
      return res.status(400).json({ message: "Invalid timeline step" });
    }

    if (!["pending", "done"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be: pending or done" });
    }

    const updateField = `timeline.${step}`;
    const update = {
      [updateField]: status,
      updatedAt: new Date()
    };

    const operation = await OperationModel.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!operation) {
      return res.status(404).json({ message: "Operation not found" });
    }

    return res.status(200).json({
      message: "Timeline step updated successfully",
      data: operation
    });

  } catch (error) {
    console.error("Error updating timeline step:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get timeline for an operation
const getOperationTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    
    const operation = await OperationModel.findById(id).select('timeline operationName status location');
    
    if (!operation) {
      return res.status(404).json({ message: "Operation not found" });
    }

    return res.status(200).json({
      message: "Timeline retrieved successfully",
      data: {
        operationId: operation._id,
        operationName: operation.operationName,
        status: operation.status,
        location: operation.location,
        timeline: operation.timeline || {}
      }
    });

  } catch (error) {
    console.error("Error fetching timeline:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Reset timeline to all pending
const resetTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const update = {};
    TL_KEYS.forEach(key => {
      update[`timeline.${key}`] = "pending";
    });
    update.updatedAt = new Date();

    const operation = await OperationModel.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!operation) {
      return res.status(404).json({ message: "Operation not found" });
    }

    return res.status(200).json({
      message: "Timeline reset successfully",
      data: operation
    });

  } catch (error) {
    console.error("Error resetting timeline:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  createOperation,
  getOperations,
  getOperationById,
  updateOperation,
  deleteOperation,
  updateTimelineStep,
  getOperationTimeline,
  resetTimeline,
};
