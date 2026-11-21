const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: "Gujarat",
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneSource: {
      type: String,
      default: null,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    emergencyNumber: {
      type: String,
      default: "108",
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    reviewsCount: {
      type: Number,
      default: 120,
    },
    type: {
      type: String,
      enum: [
        "Multispecialty",
        "Government",
        "Private Clinic",
        "Super Specialty",
        "General",
        "Diagnostic Centre",
        "Pathology Lab",
        "Specialist Clinic",
        "Maternity",
        "Eye Hospital",
        "Dental Hospital",
        "Cancer Care",
      ],
      default: "Multispecialty",
    },
    specialties: [
      {
        type: String,
        trim: true,
      },
    ],
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    doctors: [
      {
        name: String,
        specialty: String,
        experience: String,
        timing: String,
      },
    ],
    treatments: [
      {
        treatmentName: String,
        minCost: Number,
        maxCost: Number,
        recoveryDays: String,
      },
    ],
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    // GeoJSON point for 2dsphere indexing & geospatial queries
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [72.5714, 23.0225],
      },
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80",
    },
    is24x7Emergency: {
      type: Boolean,
      default: true,
    },
    ayushmanBharatAccepted: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

HospitalSchema.index({ geo: "2dsphere" });
HospitalSchema.index({ name: "text", city: "text", area: "text", district: "text", specialties: "text" });

module.exports = mongoose.model("Hospital", HospitalSchema);
