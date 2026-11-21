import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  if (response.data?.token) {
    await AsyncStorage.setItem('@auth_token', response.data.token);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const loginUser = async (identifier, password) => {
  const response = await api.post('/auth/login', { identifier, password });
  if (response.data?.token) {
    await AsyncStorage.setItem('@auth_token', response.data.token);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateProfileAPI = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  if (response.data?.user) {
    await AsyncStorage.setItem('@auth_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const updateLocationAPI = async (locationData) => {
  const response = await api.put('/auth/location', locationData);
  return response.data;
};

export const changePasswordAPI = async (currentPassword, newPassword) => {
  const response = await api.put('/auth/password', { currentPassword, newPassword });
  return response.data;
};

export const deleteAccountAPI = async (password) => {
  const response = await api.delete('/auth/account', { data: { password } });
  return response.data;
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem('@auth_token');
  await AsyncStorage.removeItem('@auth_user');
};

export const getStoredAuth = async () => {
  try {
    const token = await AsyncStorage.getItem('@auth_token');
    const userStr = await AsyncStorage.getItem('@auth_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch (e) {
    return { token: null, user: null };
  }
};
