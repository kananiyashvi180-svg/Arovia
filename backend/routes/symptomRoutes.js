const express = require("express");
const router = express.Router();
const {
  analyzeSymptoms,
  getSymptomHistory,
  clearSymptomHistory,
} = require("../controllers/symptomController");
const { protect } = require("../middleware/authMiddleware");

// Allows optional auth for quick symptom test
router.post("/analyze", (req, res, next) => {
  // If authorization header exists, verify token, otherwise proceed as guest
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return protect(req, res, next);
  }
  next();
}, analyzeSymptoms);

router.get("/history", protect, getSymptomHistory);
router.delete("/history", protect, clearSymptomHistory);

module.exports = router;

