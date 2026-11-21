import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Live Render Backend API Base URL ─────────────────────────────
// Production Render deployment for Android, iOS, and Web:
// https://arovia-6vjo.onrender.com/api
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://arovia-6vjo.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds to comfortably accommodate Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor: Attach JWT token from AsyncStorage ───────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error reading token from AsyncStorage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Sanitize Render & network errors ────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 1. If backend or reverse-proxy returns an HTML error page (e.g. Render / Cloudflare 502/503/504)
    if (
      typeof error.response?.data === 'string' &&
      (error.response.data.includes('<!DOCTYPE html>') ||
        error.response.data.includes('<html') ||
        error.response.data.includes('<head>'))
    ) {
      const isWakingUp =
        error.response.status === 502 ||
        error.response.status === 503 ||
        error.response.status === 504;
      error.response.data = {
        success: false,
        message: isWakingUp
          ? 'Arovia server is waking up. Please wait 10-15 seconds and try again.'
          : 'Server is temporarily unavailable. Please try again shortly.',
      };
    }

    // 2. Timeout / connection aborted (e.g. server cold starting)
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      if (!error.response) {
        error.response = {
          status: 408,
          data: {
            success: false,
            message:
              'Arovia server is waking up from idle mode. Please wait a moment and try again.',
          },
        };
      }
    }

    // 3. Network unreachable / no response
    if (!error.response) {
      error.response = {
        status: 0,
        data: {
          success: false,
          message:
            'Unable to connect to Arovia server. Please check your internet connection.',
        },
      };
    }

    return Promise.reject(error);
  }
);

export default api;
