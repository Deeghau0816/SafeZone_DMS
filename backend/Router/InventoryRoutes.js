const express = require("express");
const {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} = require("../Controllers/InventoryController");

const router = express.Router();

// Base: /api/inventory
router.route("/")
  .get(getInventoryItems)
  .post(createInventoryItem);

router.route("/:id")
  .get(getInventoryItemById)
  .patch(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
