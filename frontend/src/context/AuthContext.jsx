import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredAuth,
  loginUser,
  registerUser,
  logoutUser,
  getProfile,
  updateProfileAPI,
  updateLocationAPI,
  changePasswordAPI,
  deleteAccountAPI,
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const stored = await getStoredAuth();
      if (stored.token) {
        setToken(stored.token);
        setUser(stored.user);
        try {
          const profileRes = await getProfile();
          if (profileRes.success && profileRes.user) {
            setUser(profileRes.user);
          }
        } catch (e) {
          if (e.response && e.response.status === 401) {
            await logoutUser();
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load stored auth:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const data = await loginUser(identifier, password);
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (userData) => {
    const data = await registerUser(userData);
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const updateProfile = async (profileData) => {
    const data = await updateProfileAPI(profileData);
    if (data.success && data.user) {
      setUser(data.user);
    }
    return data;
  };

  const updateLocation = async (locationData) => {
    const data = await updateLocationAPI(locationData);
    if (data.success && data.location) {
      setUser((prev) => ({ ...prev, location: data.location }));
    }
    return data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    return await changePasswordAPI(currentPassword, newPassword);
  };

  const deleteAccount = async (password) => {
    const data = await deleteAccountAPI(password);
    if (data.success) {
      await logoutUser();
      setToken(null);
      setUser(null);
    }
    return data;
  };

  const logout = async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        updateProfile,
        updateLocation,
        changePassword,
        deleteAccount,
        logout,
        refreshProfile: loadStoredAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
