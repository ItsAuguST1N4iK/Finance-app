/**
 * Monobank Open API v1
 * https://api.monobank.ua/docs/
 *
 * Rate limits:
 *   - /personal/client-info : 1 req / 60 s
 *   - /personal/statement   : 1 req / 60 s per account
 * Statement max window = 31 days; for 90 days fetch = 3 requests × 60 s = 2+ min
 *
 * NOTE: The API only returns up to 90 days of history. Older transactions
 * are not available through this API. Currency amounts are always in the
 * account's native currency (e.g. EUR account shows EUR amounts).
 * operationAmount is the charged amount in the original currency if different.
 */

import type { Account, UnifiedTransaction } from '../types';
import { resolveImportCategory, categoryFields } from '../utils/categoryDetect';

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
  amount:          number;   // minor units, in account currency
  operationAmount: number;   // minor units, in operation currency (may differ)
  currencyCode:    number;   // account currency ISO numeric
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
  stmt:              MonoStatement,
  internalAccountId: string,
  ownIbans:          string[] = [],
  ownAccounts?:      Account[],
): UnifiedTransaction {
  // `amount` is in the account's currency (e.g. EUR for a EUR account)
  // This is the amount that actually affected the balance
  const amount = stmt.amount / 100;
  const fee    = Math.abs(stmt.commissionRate / 100);
  const now    = Date.now();

  // Detect self-transfer (counterIban is one of the user's own IBANs)
  const isSelfTransfer = !!(stmt.counterIban && ownIbans.includes(stmt.counterIban));
  const type = isSelfTransfer ? 'transfer' as const
             : amount > 0     ? 'income'   as const
             :                  'expense'  as const;

  const catKey = resolveImportCategory({
    mcc: stmt.mcc || undefined,
    description: stmt.description || stmt.comment || undefined,
    ownIbans,
    ownAccounts,
    counterIban: stmt.counterIban,
    amount: Math.abs(amount),
    platform: 'monobank',
    type,
    currency: isoAlpha(stmt.currencyCode),
    selfTransfer: isSelfTransfer,
  });
  const { tag, category } = categoryFields(catKey);

  return {
    id:              `mono_${stmt.id}`,
    accountId:       internalAccountId,
    platform:        'monobank',
    externalId:      stmt.id,
    type,
    amount:          Math.abs(amount),
    currency:        isoAlpha(stmt.currencyCode),
    feeAmount:       fee,
    description:     stmt.description || stmt.comment || undefined,
    mcc:             stmt.mcc || undefined,
    counterparty:    stmt.counterName || undefined,
    tag,
    category,
    transactionDate: stmt.time * 1000,
    importedAt:      now,
    rawPayload:      JSON.stringify(stmt),
  };
}

