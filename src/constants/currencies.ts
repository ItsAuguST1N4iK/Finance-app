/** ISO 4217 numeric code → alpha. Shared by Monobank API + FX rates. */
export const ISO_4217_NUMERIC: Record<number, string> = {
  980: 'UAH',
  840: 'USD',
  978: 'EUR',
  826: 'GBP',
  756: 'CHF',
  985: 'PLN',
  203: 'CZK',
  348: 'HUF',
  946: 'RON',
  36: 'AUD',
  392: 'JPY',
  156: 'CNY',
  643: 'RUB',
  124: 'CAD',
};

export function isoCurrencyAlpha(code: number): string {
  return ISO_4217_NUMERIC[code] ?? String(code);
}

export const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK', 'CAD', 'AUD', 'JPY'];

export const ALL_CURRENCIES = [
  'UAH', 'USD', 'EUR', 'GBP',
  ...AVAILABLE_CURRENCIES.filter((c) => !['UAH', 'USD', 'EUR', 'GBP'].includes(c)),
];
