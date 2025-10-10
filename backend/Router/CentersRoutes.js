// backend/Routes/CentersRoutes.js
const express = require("express");
const router = express.Router();
const CentersController = require("../Controllers/CentersController");

// Routes for centers
router.post("/collectingcenters", CentersController.addCenter); // Add a new center
router.get("/collectingcenters", CentersController.getCenters); // Get all centers
router.get("/collectingcenters/:id", CentersController.getCenterById); // Get center by ID
router.put("/collectingcenters/:id", CentersController.updateCenter); // Update center by ID
router.delete("/collectingcenters/:id", CentersController.deleteCenter); // Delete center by ID

module.exports = router;
