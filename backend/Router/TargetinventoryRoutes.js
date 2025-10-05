// backend/Routes/TargetinventoryRoutes.js
const express = require("express");
const router = express.Router();
const TargetInventory = require("../models/TargetinventoryModel");

// ✅ Create or update targets
router.post("/", async (req, res) => {
  try {
    //  we expect targets in req.body (ex: { water: 800, bedding: 200, ... })
    const targets = req.body;

    let doc = await TargetInventory.findOne();
    if (doc) {
      // update existing document
      Object.assign(doc, targets);
      await doc.save();
    } else {
      // create new document
      doc = new TargetInventory(targets);
      await doc.save();
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST /targetinventories error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get targets
router.get("/", async (req, res) => {
  try {
    const doc = await TargetInventory.findOne();
    res.json(doc || {});
  } catch (err) {
    console.error("GET /targetinventories error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
