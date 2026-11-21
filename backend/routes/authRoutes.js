const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  updateLocation,
  changePassword,
  deleteAccount,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/location", protect, updateLocation);
router.put("/password", protect, changePassword);
router.delete("/account", protect, deleteAccount);

module.exports = router;
