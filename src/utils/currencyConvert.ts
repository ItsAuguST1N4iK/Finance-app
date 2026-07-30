import type { CurrencyRate } from '../types';

function midRate(rate: CurrencyRate): number {
  if (rate.rateBuy && rate.rateSell) return (rate.rateBuy + rate.rateSell) / 2;
  return rate.rateCross ?? rate.rateBuy ?? rate.rateSell ?? 0;
}

/**
 * Convert amount to home currency using Monobank rates (quoted vs UAH).
 * If a required rate is missing, returns the original amount (cannot convert safely).
 */
export function convertToHomeCurrency(
  amount: number,
  fromCurrency: string,
  homeCurrency: string,
  rates: CurrencyRate[],
): number {
  if (!amount || fromCurrency === homeCurrency) return amount;

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
  if (inUah == null) return amount;
  const converted = fromUah(inUah, homeCurrency);
  return converted ?? amount;
}
