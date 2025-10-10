// backend/Routes/OperationRoutes.js
const express = require("express");
const router = express.Router();

const {
  createOperation,
  getOperations,
  getOperationById,
  updateOperation,
  deleteOperation,
} = require("../Controllers/OperationControllers");

// Create
router.post("/", createOperation);

// Read
router.get("/", getOperations);
router.get("/:id", getOperationById);

// Update (also accepts { timeline: { ... } } from the frontend)
router.patch("/:id", updateOperation);

// Delete
router.delete("/:id", deleteOperation);

module.exports = router;