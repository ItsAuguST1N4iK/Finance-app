import type { CurrencyRate } from '../types';
import { convertToHomeCurrency } from './currencyConvert';

/** Parsed IBKR trade line: `BUY 0.0309 VOO @ 679.19` / `SELL -0.7704 VOOG @ 82.25` */
const TRADE_RE = /^(BUY|SELL)\s+(-?[\d.]+)\s+([A-Z][A-Z0-9.]{0,11})\s+@\s+([\d.]+)/i;

export interface IbkrHoldingEstimate {
  symbol: string;
  quantity: number;
  lastPrice: number;
  currency: string;
  /** Remaining cost basis after proportional sell reductions. */
  invested: number;
  /** quantity × lastPrice for long positions. */
  marketValue: number;
  /** Share of portfolio market value 0–100. */
  sharePct: number;
  lastTradeDate: number;
}

export interface IbkrPortfolioEstimate {
  holdings: IbkrHoldingEstimate[];
  /** Net cash in positions: remaining cost basis of open holdings. */
  investedTotal: number;
  /** Sum of qty × lastPrice for long positions. */
  marketValueTotal: number;
  buyCount: number;
  sellCount: number;
}

interface TradeLeg {
  side: 'BUY' | 'SELL';
  qty: number;
  symbol: string;
  price: number;
  amount: number;
  currency: string;
  date: number;
}

export function parseIbkrTradeDescription(description: string | null | undefined): {
  side: 'BUY' | 'SELL';
  qty: number;
  symbol: string;
  price: number;
} | null {
  if (!description) return null;
  const m = description.trim().match(TRADE_RE);
  if (!m) return null;
  const side = m[1].toUpperCase() as 'BUY' | 'SELL';
  const qty = Math.abs(parseFloat(m[2]));
  const symbol = m[3].toUpperCase();
  const price = parseFloat(m[4]);
  if (!Number.isFinite(qty) || !Number.isFinite(price) || !symbol) return null;
  return { side, qty, symbol, price };
}

/**
 * Build per-ticker position from IBKR BUY/SELL rows.
 * Per-symbol invested shrinks proportionally on sells (remaining cost basis).
 * Market value uses the price from the chronologically last trade per symbol.
 * Portfolio investedTotal = Σ remaining cost basis of open holdings.
 */
export function estimateIbkrPortfolio(
  txs: Array<{
    platform: string;
    description: string | null;
    amount: number;
    currency: string;
    transaction_date: number;
    tag?: string | null;
    category?: string | null;
  }>,
  homeCurrency: string,
  rates: CurrencyRate[],
): IbkrPortfolioEstimate {
  const legs: TradeLeg[] = [];
  let buyCount = 0;
  let sellCount = 0;
  let buyCash = 0;
  let sellCash = 0;

  for (const tx of txs) {
    if (tx.platform !== 'ibkr') continue;
    const parsed = parseIbkrTradeDescription(tx.description);
    if (!parsed) continue;
    const amountHome = convertToHomeCurrency(
      Math.abs(tx.amount), tx.currency, homeCurrency, rates,
    );
    if (parsed.side === 'BUY') {
      buyCount += 1;
      buyCash += amountHome;
    } else {
      sellCount += 1;
      sellCash += amountHome;
    }
    legs.push({
      side: parsed.side,
      qty: parsed.qty,
      symbol: parsed.symbol,
      price: parsed.price,
      amount: amountHome,
      currency: tx.currency,
      date: tx.transaction_date,
    });
  }

  legs.sort((a, b) => a.date - b.date || (a.side === 'BUY' ? -1 : 1));

  const bySymbol = new Map<string, {
    qty: number;
    invested: number;
    lastPrice: number;
    currency: string;
    lastTradeDate: number;
  }>();

  for (const leg of legs) {
    const cur = bySymbol.get(leg.symbol) ?? {
      qty: 0,
      invested: 0,
      lastPrice: leg.price,
      currency: leg.currency,
      lastTradeDate: leg.date,
    };
    if (leg.side === 'BUY') {
      cur.qty += leg.qty;
      cur.invested += leg.amount;
    } else {
      const prevQty = cur.qty;
      if (prevQty > 1e-8) {
        const soldFrac = Math.min(1, leg.qty / prevQty);
        cur.invested = Math.max(0, cur.invested * (1 - soldFrac));
      } else {
        cur.invested = 0;
      }
      cur.qty -= leg.qty;
    }
    cur.lastPrice = leg.price;
    cur.currency = leg.currency;
    cur.lastTradeDate = leg.date;
    bySymbol.set(leg.symbol, cur);
  }

  const holdings: IbkrHoldingEstimate[] = [];
  let marketValueTotal = 0;

  for (const [symbol, row] of bySymbol) {
    const qty = Math.round(row.qty * 1e8) / 1e8;
    if (qty <= 1e-8) continue;
    const rawValue = qty * row.lastPrice;
    const marketValue = convertToHomeCurrency(rawValue, row.currency, homeCurrency, rates);
    marketValueTotal += marketValue;
    holdings.push({
      symbol,
      quantity: qty,
      lastPrice: row.lastPrice,
      currency: row.currency,
      invested: row.invested,
      marketValue,
      sharePct: 0,
      lastTradeDate: row.lastTradeDate,
    });
  }

  for (const h of holdings) {
    h.sharePct = marketValueTotal > 0
      ? Math.round((h.marketValue / marketValueTotal) * 1000) / 10
      : 0;
  }

  holdings.sort((a, b) => b.marketValue - a.marketValue);

  return {
    holdings,
    investedTotal: holdings.reduce((s, h) => s + h.invested, 0),
    marketValueTotal,
    buyCount,
    sellCount,
  };
}

/**
 * Market value of open IBKR positions in trade currency (qty × last trade price).
 * Used for account-card equity = cash + holdings (no FX).
 */
export function estimateIbkrNativeMarketValue(
  txs: Array<{ platform?: string; description: string | null }>,
): number {
  const bySymbol = new Map<string, { qty: number; lastPrice: number }>();

  for (const tx of txs) {
    if (tx.platform && tx.platform !== 'ibkr') continue;
    const parsed = parseIbkrTradeDescription(tx.description);
    if (!parsed) continue;
    const cur = bySymbol.get(parsed.symbol) ?? { qty: 0, lastPrice: parsed.price };
    if (parsed.side === 'BUY') cur.qty += parsed.qty;
    else cur.qty -= parsed.qty;
    cur.lastPrice = parsed.price;
    bySymbol.set(parsed.symbol, cur);
  }

  let total = 0;
  for (const row of bySymbol.values()) {
    if (row.qty <= 1e-8) continue;
    total += row.qty * row.lastPrice;
  }
  return total;
}
