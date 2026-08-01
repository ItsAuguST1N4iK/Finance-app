import type { CurrencyRate } from '../types';

function midRate(rate: CurrencyRate): number {
  if (rate.rateBuy && rate.rateSell) return (rate.rateBuy + rate.rateSell) / 2;
  return rate.rateCross ?? rate.rateBuy ?? rate.rateSell ?? 0;
}

/**
 * Convert amount to home currency using Monobank rates (quoted vs UAH).
 * Prefer {@link tryConvertToHomeCurrency} in aggregations — this helper returns 0
 * only as a last-resort display fallback and will under-count missing rates.
 */
export function convertToHomeCurrency(
  amount: number,
  fromCurrency: string,
  homeCurrency: string,
  rates: CurrencyRate[],
): number {
  return tryConvertToHomeCurrency(amount, fromCurrency, homeCurrency, rates) ?? 0;
}

/** Same as convertToHomeCurrency but returns null when conversion is impossible. */
export function tryConvertToHomeCurrency(
  amount: number,
  fromCurrency: string,
  homeCurrency: string,
  rates: CurrencyRate[],
): number | null {
  if (!amount) return 0;
  if (fromCurrency === homeCurrency) return amount;

  const toUah = (amt: number, cur: string): number | null => {
    if (cur === 'UAH') return amt;
    const r = rates.find((x) => x.code === cur);
    if (!r) return null;
    const m = midRate(r);
    return m > 0 ? amt * m : null;
  };

  const fromUah = (amt: number, cur: string): number | null => {
    if (cur === 'UAH') return amt;
    const r = rates.find((x) => x.code === cur);
    if (!r) return null;
    const m = midRate(r);
    return m > 0 ? amt / m : null;
  };

  const inUah = toUah(amount, fromCurrency);
  if (inUah == null) return null;
  return fromUah(inUah, homeCurrency);
}
