const mongoose = require("mongoose");

const SymptomSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symptoms: [
      {
        type: String,
        required: true,
      },
    ],
    possibleConditions: [
      {
        name: String,
        severity: {
          type: String,
          enum: ["Low", "Moderate", "Urgent", "Emergency"],
          default: "Moderate",
        },
        probability: String,
        explanation: String,
        recommendedSpecialist: String,
        nextSteps: [String],
      },
    ],
    urgencyLevel: {
      type: String,
      enum: ["Self-Care", "Standard Visit", "Urgent Care", "Emergency"],
      default: "Standard Visit",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SymptomSearch", SymptomSearchSchema);

