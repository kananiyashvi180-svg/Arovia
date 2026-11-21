const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Please provide a valid 10-digit mobile number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      default: "",
    },
    profileImage: {
      type: String, // base64 or URI stored locally; could be a URL in production
      default: null,
    },
    location: {
      country: { type: String, default: "India" },
      state: { type: String, default: "Gujarat" },
      district: { type: String, trim: true },
      city: { type: String, trim: true },
      taluka: { type: String, trim: true },
      villageArea: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    // Preferences
    language: {
      type: String,
      enum: ["en", "gu", "hi"],
      default: "en",
    },
    notificationPrefs: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      hospitalUpdates: { type: Boolean, default: true },
      appointmentReminders: { type: Boolean, default: true },
      healthAlerts: { type: Boolean, default: true },
    },
    privacyPrefs: {
      dataSharing: { type: Boolean, default: false },
      twoFactor: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
