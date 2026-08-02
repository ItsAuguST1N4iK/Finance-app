/**
 * Infer statement currency from file name / Monobank CSV header / IBKR content.
 */

import { ALL_CURRENCIES } from '../constants/currencies';

const ISO = new Set(ALL_CURRENCIES);

export function detectCurrencyFromFileName(name: string): string | null {
  const n = (name || '').toLowerCase();
  if (/euro|\beur\b|євро/.test(n)) return 'EUR';
  if (/dollar|\busd\b|долар/.test(n)) return 'USD';
  if (/hryvn|uah|гривн/.test(n)) return 'UAH';
  if (/\bgbp\b|фунт|pound/.test(n)) return 'GBP';
  if (/\bchf\b|франк/.test(n)) return 'CHF';
  if (/\bpln\b|злоти/.test(n)) return 'PLN';
  if (/\baud\b|австрал/.test(n)) return 'AUD';
  return null;
}

export function normalizeCurrencyCode(raw?: string | null): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  return ISO.has(c) ? c : null;
}

/** Monobank headers look like: `Card currency amount, (EUR)` */
export function currencyFromMonoHeaderCell(cell: string): string | null {
  const m = String(cell || '').match(/\(([A-Z]{3})\)\s*$/i);
  return normalizeCurrencyCode(m?.[1] ?? null);
}

/**
 * Authoritative currency for a Monobank statement CSV.
 * Prefer header `(XXX)`, then filename.
 */
export function peekMonobankStatementCurrency(
  fileName: string,
  csvContent?: string,
): string | null {
  if (csvContent) {
    const firstLine = csvContent.split(/\r?\n/, 1)[0] ?? '';
    // Match any "(EUR)" / "(UAH)" in the header row (card amount or commission cols)
    const all = [...firstLine.matchAll(/\(([A-Z]{3})\)/gi)].map((m) => m[1].toUpperCase());
    const preferred = all.find((c) => ISO.has(c));
    if (preferred) return preferred;
  }
  return detectCurrencyFromFileName(fileName);
}

export function peekIbkrStatementCurrency(fileName: string, csvContent: string): string {
  const fromName = detectCurrencyFromFileName(fileName);
  if (fromName) return fromName;

  const m = csvContent.match(/"(USD|EUR|GBP|UAH|CHF|PLN|CZK|CAD|AUD|JPY)"/);
  if (m) return m[1];
  return 'USD';
}
