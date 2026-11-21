import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './translations/en.json';
import gu from './translations/gu.json';
import hi from './translations/hi.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
];

export const LANGUAGE_STORAGE_KEY = '@arovia_language';

export const getStoredLanguage = async () => {
  try {
    return (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) || (await AsyncStorage.getItem('@mediguide_language')) || 'en';
  } catch {
    return 'en';
  }
};

export const saveLanguage = async (lang) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // fail silently
  }
};

const initI18n = async () => {
  const savedLang = await getStoredLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        en: { translation: en },
        gu: { translation: gu },
        hi: { translation: hi },
      },
      lng: savedLang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });

  return i18n;
};

export default initI18n;
export { i18n };

