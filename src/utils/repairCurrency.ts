import { getDatabase } from '../db/migrations';
import { isSelfTransfer, buildOwnAccountContext } from './selfTransfer';
import type { Account, Platform } from '../types';

export interface CurrencyRepairResult {
  /** txs restored from Monobank CSV raw cardAmount + statement currency */
  monoCsvFixed: number;
  /** txs whose currency was changed to match their account (no amount change) */
  fixedToAccount: number;
  /** txs moved from wrong-currency account to a same-platform account with matching currency */
  reassignedAccount: number;
  /** Privat FX rows that used tx-currency amount with card-currency label */
  privatFxFixed: number;
  /** self-transfer rows forced to type=transfer */
  selfTransferTyped: number;
}

interface MonoRawPayload {
  cardAmount?: number;
  opAmount?: number;
  opCurrency?: string;
  accountCurrency?: string;
  headerCurrency?: string | null;
  currencyMode?: string;
  exchangeRate?: string;
}

/**
 * Privat bug: col6 (USD/EUR op amount) was stored with col5 currency (UAH).
 * Older raw_payload still has the correct `cardAmount`.
 */
export function repairPrivatFxAmounts(): number {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      amount: number;
      currency: string;
      raw_payload: string | null;
    }>(
      `SELECT id, amount, currency, raw_payload
       FROM transactions
       WHERE platform = 'privatbank'
         AND raw_payload IS NOT NULL
         AND raw_payload LIKE '%cardAmount%'`,
    );

    let fixed = 0;
    for (const row of rows) {
      let payload: {
        cardAmount?: number;
        cardCurrency?: string;
        currency?: string;
      };
      try {
        payload = JSON.parse(row.raw_payload!);
      } catch {
        continue;
      }

      const cardAmount = Number(payload.cardAmount);
      if (!Number.isFinite(cardAmount) || cardAmount === 0) continue;

      const correct = Math.abs(cardAmount);
      const cardCur = (payload.cardCurrency || payload.currency || row.currency || 'UAH').toUpperCase();

      if (Math.abs(row.amount - correct) < 0.005 && row.currency.toUpperCase() === cardCur) {
        continue;
      }

      db.runSync(
        `UPDATE transactions SET amount = ?, currency = ? WHERE id = ?`,
        [correct, cardCur, row.id],
      );
      fixed++;
    }
    return fixed;
  } catch {
    return 0;
  }
}

/**
 * Restore Monobank CSV rows that stored operation (foreign) amount under
 * statement currency — classic Auto+repair bug: 1895.59 UAH became 1895.59 EUR.
 * Source of truth: raw_payload.cardAmount + headerCurrency/accountCurrency.
 */
export function repairMonobankCsvAmounts(): number {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      amount: number;
      currency: string;
      account_id: string;
      raw_payload: string | null;
    }>(
      `SELECT id, amount, currency, account_id, raw_payload
       FROM transactions
       WHERE platform = 'monobank'
         AND raw_payload IS NOT NULL
         AND raw_payload LIKE '%"cardAmount"%'`,
    );

    let fixed = 0;
    for (const row of rows) {
      let payload: MonoRawPayload;
      try {
        payload = JSON.parse(row.raw_payload!);
      } catch {
        continue;
      }

      // Explicit operation mode is intentional — leave alone
      if (payload.currencyMode === 'operation') continue;

      const cardAmount = Number(payload.cardAmount);
      if (!Number.isFinite(cardAmount) || cardAmount === 0) continue;

      const statementCur = (
        payload.headerCurrency
        || payload.accountCurrency
        || row.currency
        || 'UAH'
      ).toUpperCase();

      const correctAmount = Math.abs(cardAmount);
      const cur = row.currency.toUpperCase();

      const amountWrong = Math.abs(row.amount - correctAmount) >= 0.005;
      const currencyWrong = cur !== statementCur;

      // Also catch relabeled op amounts: stored ≈ |opAmount| but currency = statement
      const opAmount = Number(payload.opAmount);
      const looksLikeOpRelabel =
        Number.isFinite(opAmount)
        && Math.abs(Math.abs(opAmount) - row.amount) < 0.005
        && Math.abs(Math.abs(opAmount) - correctAmount) >= 0.02
        && (payload.opCurrency || '').toUpperCase() !== statementCur;

      if (!amountWrong && !currencyWrong && !looksLikeOpRelabel) continue;

      db.runSync(
        `UPDATE transactions SET amount = ?, currency = ? WHERE id = ?`,
        [correctAmount, statementCur, row.id],
      );
      fixed++;
    }
    return fixed;
  } catch {
    return 0;
  }
}

/** Force type=transfer for known self-transfer tags / English Mono card transfers. */
export function repairSelfTransferTypes(): number {
  try {
    const db = getDatabase();
    const accountRows = db.getAllSync<{
      id: string;
      platform: string;
      name: string;
      display_name: string | null;
      currency: string;
      iban: string | null;
      is_active: number;
    }>('SELECT id, platform, name, display_name, currency, iban, is_active FROM accounts');

    const accounts: Account[] = accountRows.map((a) => ({
      id: a.id,
      platform: a.platform as Platform,
      name: a.name,
      displayName: a.display_name ?? undefined,
      currency: a.currency,
      iban: a.iban ?? undefined,
      isActive: a.is_active === 1,
      createdAt: 0,
    }));
    const ctx = buildOwnAccountContext(accounts);

    const rows = db.getAllSync<{
      id: string;
      type: string;
      tag: string | null;
      category: string | null;
      description: string | null;
    }>(
      `SELECT id, type, tag, category, description FROM transactions
       WHERE type IN ('income', 'expense')`,
    );

    let fixed = 0;
    for (const row of rows) {
      const tagged = row.tag === 'self_transfer' || row.category === 'self_transfer';
      const byDesc = isSelfTransfer(row.description ?? undefined, undefined, undefined, ctx);
      if (!tagged && !byDesc) continue;

      db.runSync(
        `UPDATE transactions
         SET type = 'transfer',
             tag = 'self_transfer',
             category = 'self_transfer'
         WHERE id = ?`,
        [row.id],
      );
      fixed++;
    }
    return fixed;
  } catch {
    return 0;
  }
}

/**
 * Fix statement imports where amounts/currencies drifted from the card statement.
 * Never silently relabel UAH→EUR without restoring the card amount from raw_payload.
 */
export function repairCurrencyMismatches(): CurrencyRepairResult {
  const empty: CurrencyRepairResult = {
    monoCsvFixed: 0,
    fixedToAccount: 0,
    reassignedAccount: 0,
    privatFxFixed: 0,
    selfTransferTyped: 0,
  };
  try {
    const privatFxFixed = repairPrivatFxAmounts();
    const monoCsvFixed = repairMonobankCsvAmounts();
    const selfTransferTyped = repairSelfTransferTypes();
    const db = getDatabase();

    // Only align currency label to account when amounts already match card raw
    // (or there is no mono cardAmount payload). Never touch operation-mode rows.
    const fixed = db.runSync(
      `UPDATE transactions
       SET currency = (
         SELECT a.currency FROM accounts a WHERE a.id = transactions.account_id
       )
       WHERE account_id IN (
         SELECT id FROM accounts
         WHERE UPPER(COALESCE(currency, 'UAH')) IN ('EUR', 'USD', 'GBP', 'CHF', 'PLN')
           AND platform IN ('monobank', 'zen', 'ibkr', 'privatbank')
       )
       AND UPPER(COALESCE(currency, 'UAH')) = 'UAH'
       AND (
         platform != 'monobank'
         OR raw_payload IS NULL
         OR (
           raw_payload NOT LIKE '%"currencyMode":"operation"%'
           AND raw_payload NOT LIKE '%"cardAmount"%'
         )
       )`,
    );

    const accounts = db.getAllSync<{ id: string; platform: string; currency: string }>(
      `SELECT id, platform, UPPER(COALESCE(currency, 'UAH')) AS currency
       FROM accounts
       WHERE id != 'acc_default' AND is_active = 1`,
    );

    const byPlatformCurrency = new Map<string, string>();
    for (const a of accounts) {
      if (!byPlatformCurrency.has(`${a.platform}|${a.currency}`)) {
        byPlatformCurrency.set(`${a.platform}|${a.currency}`, a.id);
      }
    }

    // Move txs whose currency no longer matches their account (both directions)
    const mismatched = db.getAllSync<{
      id: string;
      account_id: string;
      platform: string;
      currency: string;
      account_currency: string;
    }>(
      `SELECT t.id, t.account_id, t.platform,
              UPPER(COALESCE(t.currency, 'UAH')) AS currency,
              UPPER(COALESCE(a.currency, 'UAH')) AS account_currency
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE t.platform IN ('monobank', 'zen', 'ibkr', 'privatbank')
         AND UPPER(COALESCE(t.currency, 'UAH')) != UPPER(COALESCE(a.currency, 'UAH'))
         AND (
           t.platform != 'monobank'
           OR t.raw_payload IS NULL
           OR t.raw_payload NOT LIKE '%"currencyMode":"operation"%'
         )`,
    );

    let reassigned = 0;
    for (const row of mismatched) {
      const target = byPlatformCurrency.get(`${row.platform}|${row.currency}`);
      if (!target || target === row.account_id) continue;
      const res = db.runSync(
        `UPDATE transactions SET account_id = ? WHERE id = ?`,
        [target, row.id],
      );
      reassigned += res.changes ?? 0;
    }

    return {
      monoCsvFixed,
      fixedToAccount: fixed.changes ?? 0,
      reassignedAccount: reassigned,
      privatFxFixed,
      selfTransferTyped,
    };
  } catch {
    return empty;
  }
}
