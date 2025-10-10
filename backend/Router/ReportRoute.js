const express = require("express");
const router = express.Router();

// IMPORTANT: exact path & casing; include `.js` to avoid resolution weirdness
const { list, metrics } = require("../Controllers/ReportController");

// Guard loudly if something is wrong so we don't pass undefined to router.get()
if (typeof list !== "function") {
  throw new Error(
    "ReportController.list is not a function. Check Controllers/ReportController.js exports."
  );
}
if (typeof metrics !== "function") {
  // not fatal, but we’ll warn
  console.warn("ReportController.metrics not found; /reports/metrics will be disabled");
}

// GET /reports?from=YYYY-MM-DD&to=YYYY-MM-DD&district=&severity=&status=&limit=&page=
router.get("/", list);

// Optional KPIs endpoint
if (typeof metrics === "function") {
  router.get("/metrics", metrics);
}

module.exports = router;
