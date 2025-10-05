const express = require("express");
const router = express.Router();
const teamLocationController = require("../Controllers/TeamLocationController");

// POST /teamLocations - Create or update team location
router.post("/", teamLocationController.createOrUpdateTeamLocation);

// GET /teamLocations - Get all team locations
router.get("/", teamLocationController.getAllTeamLocations);

// GET /teamLocations/:deploymentId - Get team location by deployment ID
router.get("/:deploymentId", teamLocationController.getTeamLocationByDeploymentId);

// DELETE /teamLocations/:deploymentId - Delete team location
router.delete("/:deploymentId", teamLocationController.deleteTeamLocation);

module.exports = router;
