const express = require("express");
const ContactController = require("../Controllers/ContactController");

const router = express.Router();

// Contact routes
router.post("/", ContactController.createContact);
router.get("/", ContactController.getAllContacts);
router.get("/search", ContactController.searchContacts);
router.get("/:id", ContactController.getContactById);
router.put("/:id", ContactController.updateContact);
router.delete("/:id", ContactController.deleteContact);


module.exports = router;
