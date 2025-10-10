const express = require("express");
const {
  createVolunteer,
  createBulk,
  getVolunteers,
  getVolunteerById,
  updateVolunteer,
  deleteVolunteer,
  toggleAssignment,
  getAssignmentStats,
} = require("../Controllers/VolunteerControllers");

const router = express.Router();

router.get("/", getVolunteers);
router.get("/stats/assignment", getAssignmentStats);
router.get("/:id", getVolunteerById);

router.post("/", createVolunteer);
router.post("/bulk", createBulk);

router.put("/:id", updateVolunteer);
router.put("/:id/assign", toggleAssignment);

router.delete("/:id", deleteVolunteer);

module.exports = router;
