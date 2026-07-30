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
    border: '#334155',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    income: '#22c55e',
    expense: '#ef4444',
    warning: '#f59e0b',
    onAccent: '#ffffff',
    tabBar: '#1a2744',
    tabBarBorder: '#253356',
    header: '#0f172a',
    inputBg: '#0f172a',
    overlay: 'rgba(0,0,0,0.72)',
    shadow: '#000000',
    glassBorder: 'rgba(255,255,255,0.12)',
    isDark: true,
  },
  cursor: {
    bg: '#1e1e1e',
    card: '#2a2a2a',
    cardAlt: '#333333',
    border: '#3d3d3d',
    text: '#e8e8e8',
    subtext: '#888888',
    income: '#4ade80',
    expense: '#f87171',
    warning: '#fbbf24',
    onAccent: '#ffffff',
    tabBar: '#242424',
    tabBarBorder: '#383838',
    header: '#1e1e1e',
    inputBg: '#161616',
    overlay: 'rgba(0,0,0,0.78)',
    shadow: '#000000',
    glassBorder: 'rgba(255,255,255,0.12)',
    isDark: true,
  },
  oled: {
    bg: '#000000',
    card: '#0d0d0d',
    cardAlt: '#1a1a1a',
    border: '#2a2a2a',
    text: '#ffffff',
    subtext: '#777777',
    income: '#00e676',
    expense: '#ff1744',
    warning: '#ffab00',
    onAccent: '#ffffff',
    tabBar: '#000000',
    tabBarBorder: '#1a1a1a',
    header: '#000000',
    inputBg: '#0d0d0d',
    overlay: 'rgba(0,0,0,0.88)',
    shadow: '#000000',
    glassBorder: 'rgba(255,255,255,0.14)',
    isDark: true,
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    cardAlt: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    subtext: '#64748b',
    income: '#16a34a',
    expense: '#dc2626',
    warning: '#d97706',
    onAccent: '#ffffff',
    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    header: '#ffffff',
    inputBg: '#f8fafc',
    overlay: 'rgba(0,0,0,0.50)',
    shadow: '#0f172a',
    glassBorder: 'rgba(15,23,42,0.08)',
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
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#f97316',
];

export { space, radius, type, layout } from './tokens';
export { sectionLabelStyle, primaryButtonStyle, ghostButtonStyle, commonStyles } from './commonStyles';
