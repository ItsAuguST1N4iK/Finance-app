export type ThemeKey = 'dark' | 'cursor' | 'oled';

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
  tabBar: string;
  tabBarBorder: string;
  header: string;
  inputBg: string;
  overlay: string;
}

type BaseTheme = Omit<AppTheme, 'accent'>;

export const THEMES: Record<ThemeKey, BaseTheme> = {
  dark: {
    bg:          '#0f172a',
    card:        '#1e293b',
    cardAlt:     '#334155',
    border:      '#334155',
    text:        '#f1f5f9',
    subtext:     '#94a3b8',
    income:      '#22c55e',
    expense:     '#ef4444',
    warning:     '#f59e0b',
    tabBar:      '#1a2744',
    tabBarBorder:'#253356',
    header:      '#0f172a',
    inputBg:     '#0f172a',
    overlay:     'rgba(0,0,0,0.72)',
  },
  cursor: {
    bg:          '#1b1b2f',
    card:        '#16213e',
    cardAlt:     '#0f3460',
    border:      '#1a2a50',
    text:        '#e2e2ff',
    subtext:     '#7b8cad',
    income:      '#00d4aa',
    expense:     '#ff6b6b',
    warning:     '#ffd93d',
    tabBar:      '#16213e',
    tabBarBorder:'#1a2a50',
    header:      '#1b1b2f',
    inputBg:     '#0d1526',
    overlay:     'rgba(0,0,20,0.80)',
  },
  oled: {
    bg:          '#000000',
    card:        '#0d0d0d',
    cardAlt:     '#1a1a1a',
    border:      '#2a2a2a',
    text:        '#ffffff',
    subtext:     '#777777',
    income:      '#00e676',
    expense:     '#ff1744',
    warning:     '#ffab00',
    tabBar:      '#000000',
    tabBarBorder:'#1a1a1a',
    header:      '#000000',
    inputBg:     '#0d0d0d',
    overlay:     'rgba(0,0,0,0.88)',
  },
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  dark:   'Dark Blue',
  cursor: 'Cursor',
  oled:   'OLED Black',
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
  '#f97316', // orange
];
