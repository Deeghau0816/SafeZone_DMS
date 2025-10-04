const express = require("express");
const ShelterController = require("../Controllers/ShelterController");

const router = express.Router();

// GET /api/shelters - Get all shelters
router.get("/", ShelterController.getAllShelters);

// GET /api/shelters/nearby - Get nearby shelters
router.get("/nearby", ShelterController.getNearbyShelters);

// GET /api/shelters/search - Search shelters
router.get("/search", ShelterController.searchShelters);

// GET /api/shelters/:id - Get shelter by ID
router.get("/:id", ShelterController.getShelterById);

// POST /api/shelters - Create new shelter
router.post("/", ShelterController.createShelter);

// PUT /api/shelters/:id - Update shelter
router.put("/:id", ShelterController.updateShelter);

// DELETE /api/shelters/:id - Delete shelter
router.delete("/:id", ShelterController.deleteShelter);

module.exports = router;
