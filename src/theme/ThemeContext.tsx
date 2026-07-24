import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getDatabase } from '../db/migrations';
import { THEMES, ThemeKey, AppTheme, DEFAULT_ACCENT, THEME_LABELS } from './index';
import { glassStyle } from '../utils/glassStyle';

export { THEME_LABELS };

interface ThemeContextValue {
  themeKey: ThemeKey;
  accent: string;
  theme: AppTheme;
  /** 0 = opaque, 100 = most transparent */
  transparencyPct: number;
  animationSpeed: number;
  setThemeKey: (key: ThemeKey) => void;
  setAccent: (color: string) => void;
  setTransparencyPct: (v: number) => void;
  setAnimationSpeed: (v: number) => void;
  dur: (ms: number) => number;
  cardSurface: (alt?: boolean) => { backgroundColor: string; borderColor: string; borderWidth: number };
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: 'dark',
  accent:   DEFAULT_ACCENT,
  theme:    { ...THEMES.dark, accent: DEFAULT_ACCENT },
  transparencyPct: 28,
  animationSpeed: 1,
  setThemeKey: () => {},
  setAccent:   () => {},
  setTransparencyPct: () => {},
  setAnimationSpeed:  () => {},
  dur: (ms) => ms,
  cardSurface: () => ({ backgroundColor: THEMES.dark.card, borderColor: 'transparent', borderWidth: 0 }),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('dark');
  const [accent,   setAccentState]   = useState(DEFAULT_ACCENT);
  const [animationSpeed, setAnimationSpeedState] = useState(1);
  const [transparencyPct, setTransparencyPctState] = useState(28);

  useEffect(() => {
    try {
      const db  = getDatabase();
      const row = db.getFirstSync<{
        theme: string | null;
        accent_color: string | null;
        animation_speed: number | null;
        glass_opacity: number | null;
        liquid_glass: number | null;
      }>(
        'SELECT theme, accent_color, animation_speed, glass_opacity, liquid_glass FROM settings WHERE id = 1',
      );
      if (row?.theme && row.theme in THEMES) setThemeKeyState(row.theme as ThemeKey);
      if (row?.accent_color) setAccentState(row.accent_color);
      if (row?.animation_speed != null) setAnimationSpeedState(row.animation_speed);
      if (row?.glass_opacity != null) {
        const legacy = row.glass_opacity;
        setTransparencyPctState(Math.round((1 - legacy) / 0.72 * 100));
      } else if (row?.liquid_glass === 0) {
        setTransparencyPctState(0);
      }
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

  function setAnimationSpeed(v: number) {
    const clamped = Math.max(0.5, Math.min(2, v));
    setAnimationSpeedState(clamped);
    try { getDatabase().runSync('UPDATE settings SET animation_speed = ? WHERE id = 1', [clamped]); } catch {}
  }

  function setTransparencyPct(v: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setTransparencyPctState(clamped);
    const legacyAlpha = 1 - clamped / 100 * 0.72;
    try {
      getDatabase().runSync(
        'UPDATE settings SET glass_opacity = ?, liquid_glass = ? WHERE id = 1',
        [legacyAlpha, clamped > 0 ? 1 : 0],
      );
    } catch {}
  }

  const dur = useCallback((ms: number) => Math.round(ms / animationSpeed), [animationSpeed]);

  const theme: AppTheme = { ...THEMES[themeKey], accent };

  const cardSurface = useCallback((alt = false) => {
    const base = alt ? theme.cardAlt : theme.card;
    return glassStyle(base, transparencyPct);
  }, [theme.card, theme.cardAlt, transparencyPct]);

  const value = useMemo(() => ({
    themeKey, accent, theme,
    transparencyPct, animationSpeed,
    setThemeKey, setAccent, setTransparencyPct, setAnimationSpeed,
    dur, cardSurface,
  }), [themeKey, accent, theme, transparencyPct, animationSpeed, dur, cardSurface]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
