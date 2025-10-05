const mongoose = require("mongoose");
const Inventory = require("../models/InventoryModel");

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

//  Create
exports.createInventoryItem = async (req, res) => {
  try {
    let { item, quantity, unit, branch, date, notes } = req.body;

    if (!item || quantity == null || !unit || !branch) {
      return res.status(400).json({ message: "item, quantity, unit, branch are required" });
    }

    // enforce key format
    item = item.toLowerCase().replace(/\s+/g, "_");

    const doc = await Inventory.create({
      item,
      quantity: Number(quantity),
      unit: String(unit).trim(),
      branch: String(branch).trim(),
      date: date ? new Date(date) : undefined,
      notes: notes || "",
    });

    res.status(201).json({ item: doc });
  } catch (err) {
    console.error("createInventoryItem error:", err);
    res.status(500).json({ message: err.message || "Failed to create inventory item" });
  }
};

// List
exports.getInventoryItems = async (req, res) => {
  try {
    const { item, branch } = req.query;
    const query = {};
    if (item) query.item = item;
    if (branch) query.branch = branch;

    const items = await Inventory.find(query).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (err) {
    console.error("getInventoryItems error:", err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

// Get by id
exports.getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const item = await Inventory.findById(id);
    if (!item) return res.status(404).json({ message: "Not found" });

    res.json({ item });
  } catch (err) {
    console.error("getInventoryItemById error:", err);
    res.status(500).json({ message: "Failed to fetch item" });
  }
};

// Update
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const payload = {};
    ["item", "quantity", "unit", "branch", "notes"].forEach((k) => {
      if (req.body[k] !== undefined) {
        if (k === "item") {
          payload[k] = req.body[k].toLowerCase().replace(/\s+/g, "_");
        } else {
          payload[k] = req.body[k];
        }
      }
    });

    if (req.body.date !== undefined) {
      payload.date = req.body.date ? new Date(req.body.date) : undefined;
    }

    const updated = await Inventory.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });

    res.json({ item: updated });
  } catch (err) {
    console.error("updateInventoryItem error:", err);
    res.status(500).json({ message: err.message || "Failed to update item" });
  }
};

// Delete
exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await Inventory.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("deleteInventoryItem error:", err);
    res.status(500).json({ message: "Failed to delete item" });
  }
};
