const express = require("express");
const router = express.Router();
const {
  getHospitals,
  getNearbyHospitals,
  getHospitalById,
  getHospitalStats,
} = require("../controllers/hospitalController");

router.get("/stats", getHospitalStats);
router.get("/nearby", getNearbyHospitals);
router.get("/:id", getHospitalById);
router.get("/", getHospitals);

module.exports = router;

