import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Explicit API Base URLs
// Connected via ngrok tunnel with registered authtoken
export const API_BASE_URL = Platform.select({
  web: 'http://localhost:5000/api',
  default: 'https://trial-shaft-anyone.ngrok-free.dev/api',
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // 30s — allows time for Atlas cold-start queries
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor: attach JWT token from AsyncStorage
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

// Response interceptor: sanitize errors (e.g., ngrok offline HTML error pages)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If ngrok or reverse proxy returns HTML error page (e.g. 404 offline tunnel)
    if (
      typeof error.response?.data === 'string' &&
      (error.response.data.includes('<!DOCTYPE html>') || error.response.data.includes('<html'))
    ) {
      error.response.data = {
        success: false,
        message: 'Backend server / tunnel is currently offline. Please ensure ngrok and the backend are running.',
      };
    }
    return Promise.reject(error);
  }
);

export default api;
