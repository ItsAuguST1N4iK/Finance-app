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

function norm(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type RawFieldOpts = {
  /** Labels already shown in the main / trade sections (Ukrainian map keys). */
  skipLabels?: Iterable<string>;
  /** Exact values already shown elsewhere (qty, symbol, price, description…). */
  skipValues?: Iterable<string>;
};

/** Flatten useful scraper/API fields from raw JSON without dumping noise / duplicates. */
export function extractRawPayloadFields(
  rawPayload?: string | null,
  opts?: RawFieldOpts,
): TxDetailRow[] {
  if (!rawPayload) return [];
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(rawPayload) as Record<string, unknown>;
  } catch {
    return [];
  }

  const skipLabels = new Set(
    [...(opts?.skipLabels ?? [])].map((l) => l.trim().toLowerCase()),
  );
  const skipValues = new Set(
    [...(opts?.skipValues ?? [])].map(norm).filter(Boolean),
  );

  const rows: TxDetailRow[] = [];
  const usedLabels = new Set<string>();

  const push = (label: string, v: unknown) => {
    if (v == null || v === '') return;
    if (typeof v === 'object') return;
    if (skipLabels.has(label.toLowerCase())) return;
    const str = String(v);
    if (skipValues.has(norm(str))) return;
    if (usedLabels.has(label)) return;
    usedLabels.add(label);
    rows.push({ label, value: str });
  };

  // Common across banks / IBKR / ZEN
  const map: Array<[string, string[]]> = [
    ['MCC', ['mcc', 'mccCode']],
    ['IBAN', ['iban', 'counterIban', 'counter_iban']],
    ['Контрагент', ['counterparty', 'comment', 'payee', 'merchant']],
    ['Категорія банку', ['bankCat', 'category', 'categoryName']],
    ['Тип', ['type', 'operationType', 'buySell']],
    ['Символ', ['symbol', 'Symbol', 'ticker']],
    ['Кількість', ['quantity', 'Quantity', 'qty']],
    ['Ціна', ['price', 'TradePrice', 'tradePrice']],
    ['Комісія', ['commission', 'Commission', 'fee', 'ibCommission']],
    ['Валюта комісії', ['commissionCurrency', 'ibCommissionCurrency']],
    ['Курс', ['exchangeRate', 'rate', 'fxRate']],
    ['Баланс після', ['balance', 'Balance']],
    ['Карта', ['cardMask', 'cardNumber']],
    ['Рахунок', ['account', 'Account', 'accountId']],
    ['Asset class', ['assetCategory', 'AssetClass']],
    ['Currency', ['currency', 'CurrencyPrimary']],
  ];

  for (const [label, keys] of map) {
    for (const k of keys) {
      if (k in raw) {
        push(label, raw[k]);
        break;
      }
    }
  }

  return rows;
}

/** Build skip sets when trade block already shows side/qty/symbol/price. */
export function tradeSkipOpts(trade: {
  side?: string;
  qty?: string;
  symbol?: string;
  price?: string;
} | null): RawFieldOpts {
  if (!trade) return {};
  return {
    skipLabels: ['Символ', 'Кількість', 'Ціна', 'Тип'],
    skipValues: [trade.side, trade.qty, trade.symbol, trade.price].filter(
      (x): x is string => !!x,
    ),
  };
}
