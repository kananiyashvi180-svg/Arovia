import api from './api';

// ── Hospital APIs ──────────────────────────────────────────────
export const getHospitals = async (params = {}) => {
  const response = await api.get('/hospitals', { params });
  return response.data;
};

export const getNearbyHospitals = async (params = {}) => {
  const response = await api.get('/hospitals/nearby', { params });
  return response.data;
};

export const reverseGeocodeBackend = async (latitude, longitude) => {
  const response = await api.get('/location/reverse', {
    params: { latitude, longitude },
  });
  return response.data;
};

export const getHospitalById = async (id) => {
  const response = await api.get(`/hospitals/${id}`);
  return response.data;
};

export const getHospitalStats = async () => {
  const response = await api.get('/hospitals/stats');
  return response.data;
};

// ── Symptom AI Navigator APIs ──────────────────────────────────
export const analyzeSymptoms = async (symptoms = []) => {
  const response = await api.post('/symptoms/analyze', { symptoms });
  return response.data;
};

export const getSymptomHistory = async () => {
  const response = await api.get('/symptoms/history');
  return response.data;
};

export const clearSymptomHistory = async () => {
  const response = await api.delete('/symptoms/history');
  return response.data;
};

// ── Favorites APIs ─────────────────────────────────────────────
export const getFavorites = async () => {
  const response = await api.get('/favorites');
  return response.data;
};

export const toggleFavoriteHospital = async (hospitalId, isCurrentlyFavorite) => {
  if (isCurrentlyFavorite) {
    const response = await api.delete(`/favorites/${hospitalId}`);
    return response.data;
  } else {
    const response = await api.post(`/favorites/${hospitalId}`);
    return response.data;
  }
};

export const checkIsFavorite = async (hospitalId) => {
  const response = await api.get(`/favorites/check/${hospitalId}`);
  return response.data;
};

