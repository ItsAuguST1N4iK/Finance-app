import { getDatabase } from '../db/migrations';
import { estimateIbkrNativeMarketValue } from './ibkrHoldings';

let balancesDirty = true;

/** Live API balances (e.g. Monobank client-info) — preferred until a statement running balance exists. */
const liveBalanceOverrides = new Map<string, number>();

/** Call after imports / upserts / deletes so next loadAccounts recomputes. */
export function markBalancesDirty(): void {
  balancesDirty = true;
}

export function areBalancesDirty(): boolean {
  return balancesDirty;
}

type TxRow = {
  account_id: string;
  platform: string;
  type: string;
  amount: number;
  fee_amount: number;
  description: string | null;
  transaction_date: number;
  raw_payload: string | null;
};

function parseRaw(payload: string | null): Record<string, unknown> | unknown[] | null {
  if (!payload) return null;
  try {
    return JSON.parse(payload) as Record<string, unknown> | unknown[];
  } catch {
    return null;
  }
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Running balance from the bank statement row, when the importer stored it.
 * Prefer this over summing txs (history is often incomplete).
 */
export function statementBalanceFromRaw(
  platform: string,
  raw: Record<string, unknown> | unknown[] | null,
): number | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    // ZEN CSV row: last column is Balance
    if (platform === 'zen' && raw.length >= 12) {
      return asFiniteNumber(raw[11]);
    }
    return null;
  }

  // Monobank API statement (minor units)
  if (platform === 'monobank' && raw.balance != null && raw.amount != null && raw.time != null) {
    const bal = asFiniteNumber(raw.balance);
    if (bal != null) return bal / 100;
  }

  // PrivatBank (stored on import) or generic
  const direct =
    asFiniteNumber(raw.balanceAfter)
    ?? asFiniteNumber(raw.balance)
    ?? asFiniteNumber(raw.Balance);
  if (direct != null) return direct;

  return null;
}

/**
 * Signed cash impact of one tx on its account.
 * Prefers original bank sign from raw_payload (amounts in DB are absolute).
 */
export function signedCashDelta(row: {
  platform: string;
  type: string;
  amount: number;
  fee_amount: number;
  description: string | null;
  raw_payload: string | null;
}): number {
  const raw = parseRaw(row.raw_payload);
  const fee = Math.abs(Number(row.fee_amount) || 0);
  const absAmt = Math.abs(Number(row.amount) || 0);
  const desc = row.description ?? '';

  if (raw && !Array.isArray(raw)) {
    // Monobank / Privat CSV: cardAmount is signed in account currency
    if (typeof raw.cardAmount === 'number' && Number.isFinite(raw.cardAmount)) {
      return raw.cardAmount;
    }

    // Monobank API: amount in minor units (balance change)
    if (row.platform === 'monobank' && typeof raw.amount === 'number' && raw.time != null) {
      return raw.amount / 100;
    }

    // IBKR trade CSV / Flex
    const buySell = String(raw['Buy/Sell'] ?? raw.BuySell ?? '').toUpperCase();
    if (buySell === 'BUY' || buySell === 'SELL' || raw.source === 'ibkr_csv_trade') {
      const proceeds = Math.abs(asFiniteNumber(raw.Proceeds) ?? absAmt);
      const comm = Math.abs(asFiniteNumber(raw.IBCommission) ?? fee);
      if (buySell === 'SELL' || /^SELL\b/i.test(desc)) return proceeds - comm;
      return -proceeds - comm;
    }

    // IBKR cash CSV
    if (raw.source === 'ibkr_csv_cash' || (raw.Amount != null && raw.Type != null)) {
      const signed = asFiniteNumber(raw.Amount);
      if (signed != null) return signed;
    }
  }

  // ZEN CSV array row: settlement amount is signed
  if (Array.isArray(raw) && row.platform === 'zen') {
    const settlement = asFiniteNumber(raw[3]);
    if (settlement != null) return settlement;
  }

  // Fallback: type + transfer direction for transfers
  if (row.type === 'income') return absAmt;
  if (row.type === 'expense' || row.type === 'fee') return -absAmt;

  if (row.type === 'transfer') {
    if (
      /^SELL\b/i.test(desc)
      || /^From\b/i.test(desc)
      || /CASH RECEIPTS|Deposit/i.test(desc)
      || /^Incoming\b/i.test(desc)
    ) {
      return absAmt - fee;
    }
    if (
      /^BUY\b/i.test(desc)
      || /^Transfer to\b/i.test(desc)
      || /^На картку/i.test(desc)
      || /Withdrawal|Outgoing/i.test(desc)
    ) {
      return -absAmt - fee;
    }
    // Unknown transfer direction — do not invent an outflow
    return 0;
  }

  return 0;
}

/**
 * Per-account balance:
 * 1) latest statement running balance from raw_payload when present
 * 2) else sum of signed cash deltas (net since first imported tx)
 * 3) IBKR: cash + open positions market value (equity), not cash alone
 */
export function computeBalancesFromTransactions(): Map<string, number> {
  const db = getDatabase();
  const rows = db.getAllSync<TxRow>(
    `SELECT account_id, platform, type, amount, fee_amount, description,
            transaction_date, raw_payload
     FROM transactions
     ORDER BY transaction_date ASC, imported_at ASC`,
  );

  const sums = new Map<string, number>();
  const statement = new Map<string, { date: number; balance: number }>();
  const ibkrTxs = new Map<string, Array<{ platform: string; description: string | null }>>();

  for (const row of rows) {
    const delta = signedCashDelta(row);
    sums.set(row.account_id, (sums.get(row.account_id) ?? 0) + delta);

    if (row.platform === 'ibkr') {
      const list = ibkrTxs.get(row.account_id) ?? [];
      list.push({ platform: row.platform, description: row.description });
      ibkrTxs.set(row.account_id, list);
    }

    const bal = statementBalanceFromRaw(row.platform, parseRaw(row.raw_payload));
    if (bal == null) continue;
    const prev = statement.get(row.account_id);
    if (!prev || row.transaction_date >= prev.date) {
      statement.set(row.account_id, { date: row.transaction_date, balance: bal });
    }
  }

  // IBKR equity = cash (statement or signed deltas) + open holdings MV — native currency, no FX.
  const map = new Map<string, number>();
  const accountIds = new Set([
    ...sums.keys(),
    ...statement.keys(),
    ...liveBalanceOverrides.keys(),
  ]);
  for (const id of accountIds) {
    const stmt = statement.get(id);
    const ibkrList = ibkrTxs.get(id);

    let bal: number;
    if (ibkrList && ibkrList.length > 0) {
      const cash = stmt ? stmt.balance : (sums.get(id) ?? 0);
      bal = cash + estimateIbkrNativeMarketValue(ibkrList);
    } else if (stmt) {
      bal = stmt.balance;
      liveBalanceOverrides.delete(id);
    } else if (liveBalanceOverrides.has(id)) {
      bal = liveBalanceOverrides.get(id)!;
    } else {
      // Keep signed reconstructed sum (may be negative: overdraft / incomplete history)
      bal = sums.get(id) ?? 0;
    }

    map.set(id, bal);
  }
  return map;
}

/** Persist computed balances; skips work when not dirty unless force. */
export function refreshAccountBalancesFromTransactions(force = false): Map<string, number> | null {
  if (!force && !balancesDirty) return null;
  const map = computeBalancesFromTransactions();
  const db = getDatabase();
  const accounts = db.getAllSync<{ id: string }>('SELECT id FROM accounts');
  db.withTransactionSync(() => {
    for (const a of accounts) {
      const bal = map.get(a.id);
      if (bal == null) {
        db.runSync('UPDATE accounts SET balance = NULL WHERE id = ?', [a.id]);
      } else {
        db.runSync('UPDATE accounts SET balance = ? WHERE id = ?', [bal, a.id]);
      }
    }
  });
  balancesDirty = false;
  return map;
}

/**
 * Apply known live balances (e.g. Monobank client-info).
 * Cached until a statement running balance appears for that account, so later
 * recomputes from incomplete history do not wipe the live figure.
 */
export function applyLiveBalances(entries: Array<{ accountId: string; balance: number }>): void {
  if (entries.length === 0) return;
  const db = getDatabase();
  db.withTransactionSync(() => {
    for (const e of entries) {
      liveBalanceOverrides.set(e.accountId, e.balance);
      db.runSync('UPDATE accounts SET balance = ? WHERE id = ?', [e.balance, e.accountId]);
    }
  });
}
