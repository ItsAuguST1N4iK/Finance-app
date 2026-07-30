import { getDatabase } from '../migrations';

export function getHomeCurrency(fallback = 'UAH'): string {
  return getHomeCurrencyOrNull() ?? fallback;
}

export function getHomeCurrencyOrNull(): string | null {
  try {
    const row = getDatabase().getFirstSync<{ home_currency: string | null }>(
      'SELECT home_currency FROM settings WHERE id = 1',
    );
    return row?.home_currency ?? null;
  } catch {
    return null;
  }
}

export function setHomeCurrency(code: string): void {
  getDatabase().runSync(
    'UPDATE settings SET home_currency = ?, base_currency_exchange = ? WHERE id = 1',
    [code, code],
  );
}

export function getPreferredCurrencies(): string[] | null {
  try {
    const row = getDatabase().getFirstSync<{ preferred_currencies: string | null }>(
      'SELECT preferred_currencies FROM settings WHERE id = 1',
    );
    if (row?.preferred_currencies) {
      const parsed = JSON.parse(row.preferred_currencies) as string[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return null;
}

export function setPreferredCurrencies(codes: string[]): void {
  getDatabase().runSync(
    'UPDATE settings SET preferred_currencies = ? WHERE id = 1',
    [JSON.stringify(codes)],
  );
}

export function getLanguage(): string | null {
  try {
    const row = getDatabase().getFirstSync<{ language: string | null }>(
      'SELECT language FROM settings WHERE id = 1',
    );
    return row?.language ?? null;
  } catch {
    return null;
  }
}

export function setLanguage(lang: string): void {
  getDatabase().runSync('UPDATE settings SET language = ? WHERE id = 1', [lang]);
}

/** Data span of all transactions (for analytics "all" preset). */
export function getTransactionDateBounds(): { minD: number; maxD: number } | null {
  const row = getDatabase().getFirstSync<{ minD: number | null; maxD: number | null }>(
    'SELECT MIN(transaction_date) as minD, MAX(transaction_date) as maxD FROM transactions WHERE transaction_date > 0',
  );
  if (row?.minD != null && row?.maxD != null) {
    return { minD: row.minD, maxD: row.maxD };
  }
  return null;
}

export interface ThemePrefsRow {
  theme: string | null;
  accent_color: string | null;
  animation_speed: number | null;
  glass_opacity: number | null;
  liquid_glass: number | null;
}

export function getThemePrefs(): ThemePrefsRow | null {
  try {
    return getDatabase().getFirstSync<ThemePrefsRow>(
      'SELECT theme, accent_color, animation_speed, glass_opacity, liquid_glass FROM settings WHERE id = 1',
    );
  } catch {
    return null;
  }
}

export function setThemeKey(key: string): void {
  getDatabase().runSync('UPDATE settings SET theme = ? WHERE id = 1', [key]);
}

export function setAccentColor(color: string): void {
  getDatabase().runSync('UPDATE settings SET accent_color = ? WHERE id = 1', [color]);
}

export function setAnimationSpeed(speed: number): void {
  getDatabase().runSync('UPDATE settings SET animation_speed = ? WHERE id = 1', [speed]);
}

export function setGlassPrefs(legacyAlpha: number, liquidGlass: number): void {
  getDatabase().runSync(
    'UPDATE settings SET glass_opacity = ?, liquid_glass = ? WHERE id = 1',
    [legacyAlpha, liquidGlass],
  );
}
