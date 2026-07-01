import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase } from '../db/migrations';
import { THEMES, ThemeKey, AppTheme, DEFAULT_ACCENT, THEME_LABELS } from './index';

// Re-export so other files can use THEME_LABELS from ThemeContext too
export { THEME_LABELS };

interface ThemeContextValue {
  themeKey: ThemeKey;
  accent: string;
  theme: AppTheme;
  setThemeKey: (key: ThemeKey) => void;
  setAccent: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: 'dark',
  accent:   DEFAULT_ACCENT,
  theme:    { ...THEMES.dark, accent: DEFAULT_ACCENT },
  setThemeKey: () => {},
  setAccent:   () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('dark');
  const [accent,   setAccentState]   = useState(DEFAULT_ACCENT);

  useEffect(() => {
    try {
      const db  = getDatabase();
      const row = db.getFirstSync<{ theme: string | null; accent_color: string | null }>(
        'SELECT theme, accent_color FROM settings WHERE id = 1'
      );
      if (row?.theme && row.theme in THEMES) setThemeKeyState(row.theme as ThemeKey);
      if (row?.accent_color)                  setAccentState(row.accent_color);
    } catch {}
  }, []);

  function setThemeKey(key: ThemeKey) {
    setThemeKeyState(key);
    try { getDatabase().runSync('UPDATE settings SET theme = ? WHERE id = 1', [key]); } catch {}
  }

  function setAccent(color: string) {
    setAccentState(color);
    try { getDatabase().runSync('UPDATE settings SET accent_color = ? WHERE id = 1', [color]); } catch {}
  }

  const theme: AppTheme = { ...THEMES[themeKey], accent };

  return (
    <ThemeContext.Provider value={{ themeKey, accent, theme, setThemeKey, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
