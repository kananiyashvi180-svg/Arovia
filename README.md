# Arovia — AI Healthcare Navigator

Arovia is a full-stack AI healthcare navigation and hospital discovery system built with React Native Expo and Node.js/Express.

## 🌟 Key Features

- **Accurate Device GPS Detection**: Real-time satellite GPS location with multi-tier administrative geocoding for all 33 Gujarat districts (Dwarka, Jamnagar, Ahmedabad, Surat, Rajkot, etc.).
- **Smart Hospital Recommendations**: Intelligent symptom-to-specialty matching that automatically suggests nearby hospitals with the right departments.
- **Verified Hospital Contacts**: Verified landlines and switchboard numbers with native dialer integration.
- **Interactive Live Map**: Real-time Leaflet map showing nearby healthcare facilities with interactive markers and directions.
- **Multilingual Support**: Full internationalization for English, Hindi (हिंदी), and Gujarati (ગુજરાતી).
- **Authentication & User Management**: Secure JWT authentication and profile management backed by MongoDB Atlas.

## 📁 Project Structure

```
Arovia/
├── backend/               # Node.js Express API & MongoDB Atlas backend
│   ├── config/            # DB & administrative location datasets
│   ├── controllers/       # Auth, Hospital, Location, Symptom controllers
│   ├── models/            # Mongoose schemas (User, Hospital)
│   ├── routes/            # REST API route handlers
│   └── server.js          # Express server entry point
├── frontend/              # React Native Expo cross-platform app
│   ├── assets/            # App icons, splash screens, and images
│   └── src/
│       ├── app/           # Expo Router screen routes
│       ├── components/    # Reusable UI components & modals
│       ├── context/       # Auth, Location, Theme, Language providers
│       ├── i18n/          # English, Hindi, and Gujarati translations
│       ├── services/      # Axios API client & endpoints
│       └── utils/         # GPS location, phone validator, specialty mappers
├── start-backend.bat      # One-click launcher for backend server
├── start-tunnel.bat       # One-click launcher for ngrok tunnel
└── README.md
```

## 🚀 Getting Started

### 1. Start Backend Server
```bash
cd backend
npm install
npm start
```

### 2. Start ngrok Tunnel (for testing on physical mobile device / Expo Go)
```bash
cd backend
npm run tunnel
```

### 3. Start Frontend Expo App
```bash
cd frontend
npm install
npx expo start --clear
```

Scan the QR code with **Expo Go** on Android or iOS.
