import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase } from '../db/migrations';
import { TRANSLATIONS, Language, Translations } from './index';

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
      const db = getDatabase();
      const row = db.getFirstSync<{ language: string | null }>(
        'SELECT language FROM settings WHERE id = 1'
      );
      if (row?.language === 'uk' || row?.language === 'en') {
        setLanguageState(row.language as Language);
      }
    } catch {}
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      getDatabase().runSync('UPDATE settings SET language = ? WHERE id = 1', [lang]);
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
