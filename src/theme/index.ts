export type ThemeKey = 'dark' | 'cursor' | 'oled' | 'light';

export interface AppTheme {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  subtext: string;
  income: string;
  expense: string;
  warning: string;
  accent: string;
  /** Text / icon color on accent-filled buttons */
  onAccent: string;
  tabBar: string;
  tabBarBorder: string;
  header: string;
  inputBg: string;
  overlay: string;
  shadow: string;
  glassBorder: string;
  isDark: boolean;
}

type BaseTheme = Omit<AppTheme, 'accent'>;

export const THEMES: Record<ThemeKey, BaseTheme> = {
  dark: {
    bg: '#0f172a',
    card: '#1e293b',
    cardAlt: '#334155',
    border: '#3f4f66',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    income: '#22c55e',
    expense: '#ef4444',
    warning: '#f59e0b',
    onAccent: '#ffffff',
    tabBar: '#1a2744',
    tabBarBorder: '#2d3f5c',
    header: '#0f172a',
    inputBg: '#0f172a',
    overlay: 'rgba(0,0,0,0.52)',
    shadow: '#000000',
    glassBorder: 'rgba(148,163,184,0.28)',
    isDark: true,
  },
  cursor: {
    bg: '#1e1e1e',
    card: '#2a2a2a',
    cardAlt: '#333333',
    border: '#4a4a4a',
    text: '#e8e8e8',
    subtext: '#888888',
    income: '#4ade80',
    expense: '#f87171',
    warning: '#fbbf24',
    onAccent: '#ffffff',
    tabBar: '#242424',
    tabBarBorder: '#404040',
    header: '#1e1e1e',
    inputBg: '#161616',
    overlay: 'rgba(0,0,0,0.55)',
    shadow: '#000000',
    glassBorder: 'rgba(255,255,255,0.18)',
    isDark: true,
  },
  oled: {
    bg: '#000000',
    card: '#121212',
    cardAlt: '#1c1c1c',
    border: '#3a3a3a',
    text: '#ffffff',
    subtext: '#a3a3a3',
    income: '#00e676',
    expense: '#ff1744',
    warning: '#ffab00',
    onAccent: '#ffffff',
    tabBar: '#000000',
    tabBarBorder: '#2a2a2a',
    header: '#000000',
    inputBg: '#121212',
    overlay: 'rgba(0,0,0,0.55)',
    shadow: '#000000',
    glassBorder: 'rgba(255,255,255,0.2)',
    isDark: true,
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    cardAlt: '#f1f5f9',
    border: '#cbd5e1',
    text: '#0f172a',
    subtext: '#64748b',
    income: '#16a34a',
    expense: '#dc2626',
    warning: '#d97706',
    onAccent: '#ffffff',
    tabBar: '#ffffff',
    tabBarBorder: '#cbd5e1',
    header: '#ffffff',
    inputBg: '#f8fafc',
    overlay: 'rgba(0,0,0,0.50)',
    shadow: '#0f172a',
    glassBorder: 'rgba(15,23,42,0.12)',
    isDark: false,
  },
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  dark: 'Dark Blue',
  cursor: 'Dark Grey',
  oled: 'OLED Black',
  light: 'Light',
};

export const DEFAULT_ACCENT = '#3b82f6';

export const ACCENT_PRESETS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  // row 2
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
  '#a855f7', // purple
  '#0ea5e9', // sky
];

export { space, radius, type, layout, stroke } from './tokens';
export { sectionLabelStyle, primaryButtonStyle, ghostButtonStyle, commonStyles } from './commonStyles';
