import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, Language, Translations } from './index';
import { getLanguage, setLanguage as persistLanguage } from '../db/repos/settings';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'uk',
  setLanguage: () => {},
  t: TRANSLATIONS.uk,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('uk');

  useEffect(() => {
    try {
      const lang = getLanguage();
      if (lang === 'uk' || lang === 'en') {
        setLanguageState(lang);
      }
    } catch {}
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      persistLanguage(lang);
    } catch {}
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: TRANSLATIONS[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
