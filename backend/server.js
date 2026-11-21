// Load environment variables FIRST — before any other imports
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// ── Arovia Route imports ──────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const symptomRoutes = require("./routes/symptomRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const locationRoutes = require("./routes/locationRoutes");

// ── Connect to MongoDB ───────────────────────────────────────
connectDB();

// ── Init Express ─────────────────────────────────────────────
const app = express();

// ── Core Middleware ──────────────────────────────────────────
app.use(cors());           // Enable Cross-Origin Resource Sharing
app.use(express.json());   // Parse incoming JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies

// ── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    name: "Arovia — AI Healthcare Navigator",
    version: "2.0.0",
    message: "Arovia API server is running live!",
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/location", locationRoutes);

// ── Error Handling (must be LAST) ────────────────────────────
app.use(notFound);       // Catch undefined routes → 404
app.use(errorHandler);   // Centralized error formatter → 4xx / 5xx

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🏥 Arovia Backend running on port ${PORT} (0.0.0.0)`
  );
});
