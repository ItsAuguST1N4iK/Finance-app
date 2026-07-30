import {
  getHomeCurrencyOrNull,
  setHomeCurrency,
  getPreferredCurrencies,
  setPreferredCurrencies,
} from '../db/repos/settings';

export function loadPreferredCurrencies(): string[] | null {
  return getPreferredCurrencies();
}

export function savePreferredCurrencies(updated: string[]): void {
  try {
    setPreferredCurrencies(updated);
  } catch {}
}

export function loadHomeCurrency(): string | null {
  return getHomeCurrencyOrNull();
}

export function saveHomeCurrency(code: string): void {
  try {
    setHomeCurrency(code);
  } catch {}
}
