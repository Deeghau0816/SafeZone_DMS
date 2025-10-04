const express = require("express");
const router = express.Router();
const ctrl = require("../Controllers/RequestsController");

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;


