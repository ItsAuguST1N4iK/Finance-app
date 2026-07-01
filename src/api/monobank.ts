/**
 * Monobank Open API v1
 * https://api.monobank.ua/docs/
 *
 * Rate limits:
 *   - /personal/client-info : 1 req / 60 s
 *   - /personal/statement   : 1 req / 60 s per account
 * Statement max window = 31 days; for 90 days fetch = 3 requests × 60 s = 2+ min
 */

import type { Account, UnifiedTransaction } from '../types';

const BASE = 'https://api.monobank.ua';

// ISO 4217 numeric → string
const CURRENCY_MAP: Record<number, string> = {
  980: 'UAH', 840: 'USD', 978: 'EUR', 826: 'GBP', 756: 'CHF',
  985: 'PLN', 203: 'CZK', 348: 'HUF', 946: 'RON', 36:  'AUD',
  392: 'JPY', 156: 'CNY', 643: 'RUB',
};

function isoAlpha(code: number): string {
  return CURRENCY_MAP[code] ?? String(code);
}

function detectType(amount: number): 'income' | 'expense' {
  return amount > 0 ? 'income' : 'expense';
}

// ─── API response types ───────────────────────────

interface MonoAccount {
  id:          string;
  sendId:      string;
  balance:     number; // minor units
  creditLimit: number;
  type:        string; // 'black' | 'white' | 'platinum' | 'iron' | 'fop' | 'yellow'
  currencyCode: number;
  cashbackType: string;
  maskedPan:   string[];
  iban:        string;
}

interface MonoClientInfo {
  clientId:   string;
  name:       string;
  accounts:   MonoAccount[];
  jars?:      MonoAccount[];
}

interface MonoStatement {
  id:              string;
  time:            number;   // unix seconds
  description:     string;
  mcc:             number;
  originalMcc:     number;
  hold:            boolean;
  amount:          number;   // minor units
  operationAmount: number;
  currencyCode:    number;
  commissionRate:  number;   // minor units
  cashbackAmount:  number;
  balance:         number;   // minor units
  comment?:        string;
  receiptId?:      string;
  counterName?:    string;
  counterIban?:    string;
}

// ─── Public API ───────────────────────────────────

export async function fetchMonoClientInfo(token: string): Promise<{
  clientId: string;
  name:     string;
  accounts: Array<{ raw: MonoAccount; account: Omit<Account, 'id' | 'createdAt'> }>;
}> {
  const res = await fetch(`${BASE}/personal/client-info`, {
    headers: { 'X-Token': token },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Monobank: ${res.status} ${body}`);
  }

  const data: MonoClientInfo = await res.json();

  const accounts = data.accounts.map((acc) => ({
    raw: acc,
    account: {
      platform:   'monobank' as const,
      name:       acc.maskedPan[0] ?? acc.type,
      currency:   isoAlpha(acc.currencyCode),
      iban:       acc.iban || undefined,
      externalId: acc.id,
      balance:    acc.balance / 100,
      isActive:   true,
    },
  }));

  return { clientId: data.clientId, name: data.name, accounts };
}

export interface SyncProgress {
  step:    string;
  current: number;
  total:   number;
}

export async function fetchMonoStatement(
  token:     string,
  accountId: string, // Monobank account.id (externalId)
  from:      number, // unix seconds
  to:        number, // unix seconds
): Promise<MonoStatement[]> {
  const res = await fetch(
    `${BASE}/personal/statement/${accountId}/${from}/${to}`,
    { headers: { 'X-Token': token } },
  );

  if (res.status === 429) {
    throw new Error('rate_limit');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Monobank statement: ${res.status} ${body}`);
  }

  return res.json();
}

export function monoStatementToTx(
  stmt:      MonoStatement,
  internalAccountId: string,
): UnifiedTransaction {
  const amount  = stmt.amount / 100;
  const fee     = Math.abs(stmt.commissionRate / 100);
  const now     = Date.now();

  return {
    id:              `mono_${stmt.id}`,
    accountId:       internalAccountId,
    platform:        'monobank',
    externalId:      stmt.id,
    type:            detectType(amount),
    amount:          Math.abs(amount),
    currency:        isoAlpha(stmt.currencyCode),
    feeAmount:       fee,
    description:     stmt.description || stmt.comment || undefined,
    mcc:             stmt.mcc || undefined,
    counterparty:    stmt.counterName || undefined,
    transactionDate: stmt.time * 1000,
    importedAt:      now,
    rawPayload:      JSON.stringify(stmt),
  };
}

export async function fullMonoSync(
  token:     string,
  daysBack:  number,
  onProgress: (p: SyncProgress) => void,
): Promise<{
  accounts: Array<{ raw: MonoAccount; account: Omit<Account, 'id' | 'createdAt'>; internalId?: string }>;
  transactions: UnifiedTransaction[];
}> {
  onProgress({ step: 'Отримуємо рахунки…', current: 0, total: 1 });

  const { accounts } = await fetchMonoClientInfo(token);

  const nowSec   = Math.floor(Date.now() / 1000);
  const fromSec  = nowSec - daysBack * 24 * 60 * 60;

  // Split into 31-day windows (Mono max range)
  const MAX_WINDOW = 30 * 24 * 60 * 60;
  const windows: Array<{ from: number; to: number }> = [];
  for (let t = fromSec; t < nowSec; t += MAX_WINDOW) {
    windows.push({ from: t, to: Math.min(t + MAX_WINDOW, nowSec) });
  }

  const totalRequests = accounts.length * windows.length;
  let   done          = 0;
  const allTxs: UnifiedTransaction[] = [];

  for (const { raw, account } of accounts) {
    for (const win of windows) {
      done++;
      onProgress({
        step:    `${account.name} · ${new Date(win.from * 1000).toLocaleDateString('uk-UA')}`,
        current: done,
        total:   totalRequests,
      });

      try {
        const stmts = await fetchMonoStatement(token, raw.id, win.from, win.to);
        // We don't know internalId yet; caller resolves after upsert
        const txs = stmts.map((s) => monoStatementToTx(s, raw.id));
        allTxs.push(...txs);
      } catch (e: unknown) {
        if ((e as Error)?.message === 'rate_limit') {
          // Wait 65 seconds then retry
          onProgress({ step: 'Ліміт API — чекаємо 65 с…', current: done, total: totalRequests });
          await new Promise((r) => setTimeout(r, 65_000));
          done--;
          // Retry this window
          continue;
        }
        console.warn('[mono] statement error:', e);
      }

      // Respect rate limit — 1 req / 60 s between statement calls
      if (done < totalRequests) {
        await new Promise((r) => setTimeout(r, 62_000));
      }
    }
  }

  onProgress({ step: 'Готово!', current: totalRequests, total: totalRequests });
  return { accounts, transactions: allTxs };
}
