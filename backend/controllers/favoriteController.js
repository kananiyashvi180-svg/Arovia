const Favorite = require("../models/Favorite");

// ── GET /api/favorites ─────────────────────────────────────────
const getFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate("hospital")
      .sort({ createdAt: -1 });

    const hospitalList = favorites
      .filter((fav) => fav.hospital !== null)
      .map((fav) => fav.hospital);

    res.status(200).json({
      success: true,
      count: hospitalList.length,
      data: hospitalList,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/favorites/:hospitalId ────────────────────────────
const addFavorite = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;

    const existing = await Favorite.findOne({
      user: req.user._id,
      hospital: hospitalId,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Hospital is already in your favorites",
        isFavorite: true,
      });
    }

    await Favorite.create({
      user: req.user._id,
      hospital: hospitalId,
    });

    res.status(201).json({
      success: true,
      message: "Hospital added to favorites",
      isFavorite: true,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/favorites/:hospitalId ──────────────────────────
const removeFavorite = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;

    await Favorite.findOneAndDelete({
      user: req.user._id,
      hospital: hospitalId,
    });

    res.status(200).json({
      success: true,
      message: "Hospital removed from favorites",
      isFavorite: false,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/favorites/check/:hospitalId ───────────────────────
const checkIsFavorite = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const exists = await Favorite.findOne({
      user: req.user._id,
      hospital: hospitalId,
    });

    res.status(200).json({
      success: true,
      isFavorite: !!exists,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkIsFavorite,
};

