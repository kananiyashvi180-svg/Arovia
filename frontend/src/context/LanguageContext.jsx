import React, { createContext, useContext, useState, useEffect } from 'react';
import { i18n, saveLanguage, getStoredLanguage, SUPPORTED_LANGUAGES } from '../i18n/i18n';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getStoredLanguage().then((lang) => {
      setCurrentLanguage(lang);
      if (i18n.isInitialized) {
        i18n.changeLanguage(lang);
      }
      setIsReady(true);
    });
  }, []);

  const changeLanguage = async (langCode) => {
    setCurrentLanguage(langCode);
    await saveLanguage(langCode);
    if (i18n.isInitialized) {
      await i18n.changeLanguage(langCode);
    }
  };

  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        currentLangInfo,
        changeLanguage,
        isReady,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

