const express = require("express");
const router = express.Router();
const {
  reverseGeocode,
  getDistricts,
} = require("../controllers/locationController");

router.get("/reverse", reverseGeocode);
router.get("/districts", getDistricts);

module.exports = router;
