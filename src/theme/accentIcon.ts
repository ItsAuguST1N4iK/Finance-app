import { Platform } from 'react-native';
import { DEFAULT_ACCENT } from './index';

/** Stable launcher-icon keys — must match `@howincodes/expo-dynamic-app-icon` in app.json */
export const ACCENT_ICON_BY_HEX: Record<string, string> = {
  '#3b82f6': 'blue',
  '#8b5cf6': 'violet',
  '#06b6d4': 'cyan',
  '#10b981': 'emerald',
  '#f59e0b': 'amber',
  '#ef4444': 'red',
  '#ec4899': 'pink',
  '#f97316': 'orange',
  '#14b8a6': 'teal',
  '#6366f1': 'indigo',
  '#84cc16': 'lime',
  '#e11d48': 'rose',
  '#a855f7': 'purple',
  '#0ea5e9': 'sky',
};

export function accentToIconName(hex: string): string {
  const key = (hex || DEFAULT_ACCENT).trim().toLowerCase();
  return ACCENT_ICON_BY_HEX[key] ?? 'blue';
}

/**
 * Sync Android/iOS launcher icon with the selected accent.
 * No-op in Expo Go / web; requires a native build with the dynamic-icon plugin.
 */
export async function applyAccentAppIcon(accentHex: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { setAppIcon } = await import('@howincodes/expo-dynamic-app-icon');
    const name = accentToIconName(accentHex);
    // false = apply when possible without long background delay (Android still
    // typically shows the new icon after leaving the app).
    await setAppIcon(name, false);
  } catch {
    /* Expo Go / missing native module */
  }
}
