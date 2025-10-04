const TeamLocation = require("../models/TeamLocationModel");

// Create or update team location
exports.createOrUpdateTeamLocation = async (req, res) => {
  try {
    const { deploymentId, team, teamName, latitude, longitude, lastUpdated, status } = req.body;

    // Validate required fields
    if (!deploymentId || !team || !teamName || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Check if location already exists for this deployment
    const existingLocation = await TeamLocation.findOne({ deploymentId });

    if (existingLocation) {
      // Update existing location
      existingLocation.team = team;
      existingLocation.teamName = teamName;
      existingLocation.latitude = latitude;
      existingLocation.longitude = longitude;
      existingLocation.lastUpdated = lastUpdated;
      existingLocation.status = status || existingLocation.status;

      await existingLocation.save();

      return res.status(200).json({
        success: true,
        message: "Team location updated successfully",
        teamLocation: existingLocation,
      });
    } else {
      // Create new location
      const newLocation = new TeamLocation({
        deploymentId,
        team,
        teamName,
        latitude,
        longitude,
        lastUpdated,
        status: status || "Pending",
      });

      await newLocation.save();

      return res.status(201).json({
        success: true,
        message: "Team location created successfully",
        teamLocation: newLocation,
      });
    }
  } catch (error) {
    console.error("Error creating/updating team location:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all team locations
exports.getAllTeamLocations = async (req, res) => {
  try {
    const teamLocations = await TeamLocation.find().sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      teamLocations,
    });
  } catch (error) {
    console.error("Error fetching team locations:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get team location by deployment ID
exports.getTeamLocationByDeploymentId = async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const teamLocation = await TeamLocation.findOne({ deploymentId });

    if (!teamLocation) {
      return res.status(404).json({
        success: false,
        message: "Team location not found",
      });
    }

    return res.status(200).json({
      success: true,
      teamLocation,
    });
  } catch (error) {
    console.error("Error fetching team location:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete team location
exports.deleteTeamLocation = async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const deletedLocation = await TeamLocation.findOneAndDelete({ deploymentId });

    if (!deletedLocation) {
      return res.status(404).json({
        success: false,
        message: "Team location not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team location deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team location:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
