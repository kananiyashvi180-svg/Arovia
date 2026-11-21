import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = '@mediguide_theme_mode';

export const ThemeModeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('dark'); // default matches reference screenshot dark navy

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setThemeMode(saved);
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
  };

  const toggleTheme = async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  const colors = Colors[themeMode];
  const isDark = themeMode === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeModeProvider');
  }
  return context;
};

