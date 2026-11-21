const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Helper: Generate JWT Token ──────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ─── Helper: Send token response ─────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: formatUser(user),
  });
};

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  bio: user.bio,
  profileImage: user.profileImage,
  location: user.location,
  language: user.language,
  notificationPrefs: user.notificationPrefs,
  privacyPrefs: user.privacyPrefs,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide name, email, and password" });
    }

    if (mobile && !/^[0-9]{10}$/.test(mobile.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit mobile number" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const formattedLocation = {
      country: location?.country || "India",
      state: location?.state || "Gujarat",
      district: location?.district || "",
      city: location?.city || "",
      taluka: location?.taluka || "",
      villageArea: location?.villageArea || "",
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
    };

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile ? mobile.trim() : undefined,
      password: hashedPassword,
      location: formattedLocation,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Login user via email or mobile & return JWT
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { identifier, email, password } = req.body;
    const loginKey = identifier || email;

    if (!loginKey || !password) {
      return res.status(400).json({ success: false, message: "Please provide your email/mobile and password" });
    }

    const cleanKey = loginKey.trim();
    let query = {};
    if (/^[0-9]{10}$/.test(cleanKey)) {
      query.mobile = cleanKey;
    } else {
      query.email = cleanKey.toLowerCase();
    }

    const user = await User.findOne(query).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email/mobile or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email/mobile or password" });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get currently logged-in user profile
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user: formatUser(user) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update user profile (name, mobile, bio, city, language, prefs)
// @route   PUT /api/auth/profile
// @access  Private
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { name, mobile, bio, city, language, profileImage, notificationPrefs, privacyPrefs } = req.body;

    // Validate mobile if provided
    if (mobile && !/^[0-9]{10}$/.test(mobile.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit mobile number" });
    }

    // Validate language
    if (language && !["en", "gu", "hi"].includes(language)) {
      return res.status(400).json({ success: false, message: "Invalid language code" });
    }

    // Apply updates
    if (name !== undefined) user.name = name.trim();
    if (mobile !== undefined) user.mobile = mobile.trim();
    if (bio !== undefined) user.bio = bio.trim().slice(0, 200);
    if (city !== undefined) user.location = { ...user.location, city: city.trim() };
    if (language !== undefined) user.language = language;
    if (profileImage !== undefined) user.profileImage = profileImage;

    if (notificationPrefs && typeof notificationPrefs === "object") {
      user.notificationPrefs = { ...user.notificationPrefs, ...notificationPrefs };
    }
    if (privacyPrefs && typeof privacyPrefs === "object") {
      user.privacyPrefs = { ...user.privacyPrefs, ...privacyPrefs };
    }

    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", user: formatUser(user) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update user location
// @route   PUT /api/auth/location
// @access  Private
// ─────────────────────────────────────────────────────────────
const updateLocation = async (req, res, next) => {
  try {
    const { district, city, taluka, villageArea, latitude, longitude } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.location = {
      country: "India",
      state: "Gujarat",
      district: district || user.location.district,
      city: city || user.location.city,
      taluka: taluka || user.location.taluka,
      villageArea: villageArea !== undefined ? villageArea : user.location.villageArea,
      latitude: latitude !== undefined ? latitude : user.location.latitude,
      longitude: longitude !== undefined ? longitude : user.location.longitude,
    };

    await user.save();
    res.status(200).json({ success: true, message: "Location updated successfully", location: user.location });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Change user password (requires current password)
// @route   PUT /api/auth/password
// @access  Private
// ─────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new password" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Delete user account permanently
// @route   DELETE /api/auth/account
// @access  Private
// ─────────────────────────────────────────────────────────────
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Please provide your password to confirm deletion" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password. Account deletion cancelled." });
    }

    // Delete associated data
    const Favorite = require("../models/Favorite");
    const SymptomSearch = require("../models/SymptomSearch");
    await Favorite.deleteMany({ user: user._id });
    await SymptomSearch.deleteMany({ user: user._id });

    // Delete the user
    await User.findByIdAndDelete(user._id);

    res.status(200).json({ success: true, message: "Account and all associated data deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, updateLocation, changePassword, deleteAccount };
