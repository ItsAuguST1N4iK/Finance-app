import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { THEMES, ThemeKey, AppTheme, DEFAULT_ACCENT, THEME_LABELS } from './index';
import { glassStyle } from '../utils/glassStyle';
import {
  getThemePrefs,
  setThemeKey as persistThemeKey,
  setAccentColor,
  setAnimationSpeed as persistAnimationSpeed,
  setGlassPrefs,
} from '../db/repos/settings';

export { THEME_LABELS };

/** Colors only — list rows / static chrome should prefer this to avoid slider fan-out. */
interface ThemeVisualValue {
  themeKey: ThemeKey;
  accent: string;
  theme: AppTheme;
  setThemeKey: (key: ThemeKey) => void;
  setAccent: (color: string) => void;
}

interface ThemeFxValue {
  transparencyPct: number;
  animationSpeed: number;
  setTransparencyPct: (v: number) => void;
  setAnimationSpeed: (v: number) => void;
  dur: (ms: number) => number;
  calmDur: (ms: number) => number;
  cardSurface: (alt?: boolean) => { backgroundColor: string; borderColor?: string; borderWidth?: number };
}

type ThemeContextValue = ThemeVisualValue & ThemeFxValue;

const ThemeVisualContext = createContext<ThemeVisualValue>({
  themeKey: 'dark',
  accent: DEFAULT_ACCENT,
  theme: { ...THEMES.dark, accent: DEFAULT_ACCENT },
  setThemeKey: () => {},
  setAccent: () => {},
});

const ThemeFxContext = createContext<ThemeFxValue>({
  transparencyPct: 28,
  animationSpeed: 1,
  setTransparencyPct: () => {},
  setAnimationSpeed: () => {},
  dur: (ms) => ms,
  calmDur: (ms) => ms,
  cardSurface: () => ({ backgroundColor: THEMES.dark.card, borderColor: 'transparent', borderWidth: 0 }),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('dark');
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [animationSpeed, setAnimationSpeedState] = useState(1);
  const [transparencyPct, setTransparencyPctState] = useState(28);

  useEffect(() => {
    try {
      const row = getThemePrefs();
      if (row?.theme && row.theme in THEMES) setThemeKeyState(row.theme as ThemeKey);
      if (row?.accent_color) setAccentState(row.accent_color);
      if (row?.animation_speed != null) setAnimationSpeedState(row.animation_speed);
      if (row?.glass_opacity != null) {
        const legacy = row.glass_opacity;
        setTransparencyPctState(Math.round((1 - legacy) / 0.72 * 100));
      } else if (row?.liquid_glass === 0) {
        setTransparencyPctState(0);
      }
    } catch { /* ignore */ }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    try { persistThemeKey(key); } catch { /* ignore */ }
  }, []);

  const setAccent = useCallback((color: string) => {
    setAccentState(color);
    try { setAccentColor(color); } catch { /* ignore */ }
  }, []);

  const setAnimationSpeed = useCallback((v: number) => {
    const clamped = Math.max(0.5, Math.min(2, v));
    setAnimationSpeedState(clamped);
    try { persistAnimationSpeed(clamped); } catch { /* ignore */ }
  }, []);

  const setTransparencyPct = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setTransparencyPctState(clamped);
    const legacyAlpha = 1 - clamped / 100 * 0.72;
    try {
      setGlassPrefs(legacyAlpha, clamped > 0 ? 1 : 0);
    } catch { /* ignore */ }
  }, []);

  const dur = useCallback(
    (ms: number) => Math.max(140, Math.round(ms / animationSpeed)),
    [animationSpeed],
  );

  const calmDur = useCallback(
    (ms: number) => Math.max(180, Math.round(ms / Math.min(animationSpeed, 1.25))),
    [animationSpeed],
  );

  const theme: AppTheme = useMemo(
    () => ({ ...THEMES[themeKey], accent }),
    [themeKey, accent],
  );

  const cardSurface = useCallback((alt = false) => {
    const base = alt ? theme.cardAlt : theme.card;
    return glassStyle(base, transparencyPct, theme.glassBorder);
  }, [theme.card, theme.cardAlt, theme.glassBorder, transparencyPct]);

  const visual = useMemo(() => ({
    themeKey, accent, theme, setThemeKey, setAccent,
  }), [themeKey, accent, theme, setThemeKey, setAccent]);

  const fx = useMemo(() => ({
    transparencyPct, animationSpeed,
    setTransparencyPct, setAnimationSpeed,
    dur, calmDur, cardSurface,
  }), [
    transparencyPct, animationSpeed,
    setTransparencyPct, setAnimationSpeed,
    dur, calmDur, cardSurface,
  ]);

  return (
    <ThemeVisualContext.Provider value={visual}>
      <ThemeFxContext.Provider value={fx}>
        {children}
      </ThemeFxContext.Provider>
    </ThemeVisualContext.Provider>
  );
}

/** Full theme API (re-renders on visual OR fx changes). */
export function useTheme(): ThemeContextValue {
  const visual = useContext(ThemeVisualContext);
  const fx = useContext(ThemeFxContext);
  return useMemo(() => ({ ...visual, ...fx }), [visual, fx]);
}

/** Colors only — safe for list rows / static UI. */
export function useThemeVisual(): ThemeVisualValue {
  return useContext(ThemeVisualContext);
}

/** Motion / glass prefs only. */
export function useThemeFx(): ThemeFxValue {
  return useContext(ThemeFxContext);
}
