import type { CurrencyRate } from '../store/exchangeRatesSlice';

function midRate(rate: CurrencyRate): number {
  if (rate.rateBuy && rate.rateSell) return (rate.rateBuy + rate.rateSell) / 2;
  return rate.rateCross ?? rate.rateBuy ?? rate.rateSell ?? 0;
}

/** Convert amount to home currency using Monobank rates (quoted vs UAH). */
export function convertToHomeCurrency(
  amount: number,
  fromCurrency: string,
  homeCurrency: string,
  rates: CurrencyRate[],
): number {
  if (!amount || fromCurrency === homeCurrency) return amount;

  const toUah = (amt: number, cur: string): number => {
    if (cur === 'UAH') return amt;
    const r = rates.find((x) => x.code === cur);
    if (!r) return amt;
    const m = midRate(r);
    return m > 0 ? amt * m : amt;
  };

  const fromUah = (amt: number, cur: string): number => {
    if (cur === 'UAH') return amt;
    const r = rates.find((x) => x.code === cur);
    if (!r) return amt;
    const m = midRate(r);
    return m > 0 ? amt / m : amt;
  };

  return fromUah(toUah(amount, fromCurrency), homeCurrency);
}
