/**
 * Parse trade-like descriptions and raw_payload into display rows for TxDetailModal.
 */
export interface TxDetailRow {
  label: string;
  value: string;
}

const BUY_SELL_RE = /^(BUY|SELL)\s+([\d.]+)\s+(\S+)\s+@\s+([\d.]+)/i;

export function parseTradeDescription(description?: string | null): {
  side?: string;
  qty?: string;
  symbol?: string;
  price?: string;
} | null {
  if (!description) return null;
  const m = description.trim().match(BUY_SELL_RE);
  if (!m) return null;
  return { side: m[1].toUpperCase(), qty: m[2], symbol: m[3], price: m[4] };
}

/** Flatten useful scraper/API fields from raw JSON without dumping noise. */
export function extractRawPayloadFields(rawPayload?: string | null): TxDetailRow[] {
  if (!rawPayload) return [];
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(rawPayload) as Record<string, unknown>;
  } catch {
    return [];
  }

  const rows: TxDetailRow[] = [];
  const push = (label: string, v: unknown) => {
    if (v == null || v === '') return;
    if (typeof v === 'object') return;
    rows.push({ label, value: String(v) });
  };

  // Common across banks / IBKR / ZEN
  const map: Array<[string, string[]]> = [
    ['MCC', ['mcc', 'mccCode']],
    ['IBAN', ['iban', 'counterIban', 'counter_iban']],
    ['Контрагент', ['counterparty', 'description', 'comment', 'payee', 'merchant']],
    ['Категорія банку', ['bankCat', 'category', 'categoryName']],
    ['Тип', ['type', 'operationType', 'buySell']],
    ['Символ', ['symbol', 'Symbol', 'ticker']],
    ['Кількість', ['quantity', 'Quantity', 'qty']],
    ['Ціна', ['price', 'TradePrice', 'tradePrice']],
    ['Комісія', ['commission', 'Commission', 'fee']],
    ['Валюта комісії', ['commissionCurrency', 'ibCommissionCurrency']],
    ['Курс', ['exchangeRate', 'rate', 'fxRate']],
    ['Баланс після', ['balance', 'Balance']],
    ['Карта', ['cardMask', 'cardNumber']],
    ['Рахунок', ['account', 'Account', 'accountId']],
    ['Asset class', ['assetCategory', 'AssetClass']],
    ['Currency', ['currency', 'CurrencyPrimary']],
  ];

  const used = new Set<string>();
  for (const [label, keys] of map) {
    for (const k of keys) {
      if (k in raw && !used.has(label)) {
        push(label, raw[k]);
        used.add(label);
        break;
      }
    }
  }

  return rows;
}
