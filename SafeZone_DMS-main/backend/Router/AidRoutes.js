// Routes/AidRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../Controllers/AidController");

// POST must be only at "/"
router.post("/", ctrl.createAid);
router.get("/",  ctrl.listAids);
router.get("/:id", ctrl.getAid);
router.put("/:id", ctrl.updateAid);
router.delete("/:id", ctrl.deleteAid);

module.exports = router;
