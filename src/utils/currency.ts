const CURRENCY_SYMBOLS: Record<string, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'Fr',
  PLN: 'zł',
  CZK: 'Kč',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}
