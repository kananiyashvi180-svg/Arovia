const express = require("express");
const router = express.Router();
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkIsFavorite,
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // all favorites routes require authentication

router.get("/", getFavorites);
router.get("/check/:hospitalId", checkIsFavorite);
router.post("/:hospitalId", addFavorite);
router.delete("/:hospitalId", removeFavorite);

module.exports = router;

