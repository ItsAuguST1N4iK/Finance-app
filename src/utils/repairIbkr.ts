import { getDatabase } from '../db/migrations';

let repairedThisSession = false;

/**
 * Reclassify IBKR rows in DB (unlocked categories only).
 * Runs at most once per app session unless force=true — avoids analytics freezes.
 */
export function repairIbkrInvestments(force = false): number {
  if (repairedThisSession && !force) return 0;
  try {
    const db = getDatabase();
    let total = 0;
    const unlocked = 'COALESCE(category_locked, 0) = 0';

    const buy = db.runSync(
      `UPDATE transactions
       SET type = 'transfer', tag = 'investment', category = 'investment'
       WHERE platform = 'ibkr'
         AND ${unlocked}
         AND (description LIKE 'BUY %' OR description LIKE 'TRADE %'
              OR (description LIKE '% @ %' AND description NOT LIKE 'SELL %'
                  AND description NOT LIKE '%CASH%'
                  AND description NOT LIKE '%DIVIDEND%'))`,
    );
    total += buy.changes ?? 0;

    const sell = db.runSync(
      `UPDATE transactions
       SET type = 'transfer', tag = 'realized', category = 'realized'
       WHERE platform = 'ibkr'
         AND ${unlocked}
         AND (description LIKE 'SELL %' OR description LIKE 'Sell %')`,
    );
    total += sell.changes ?? 0;

    const sellAny = db.runSync(
      `UPDATE transactions
       SET type = 'transfer', tag = 'realized', category = 'realized'
       WHERE ${unlocked}
         AND description LIKE 'SELL %'
         AND (tag IS NULL OR tag IN ('investment', 'transfer', 'other')
              OR category IN ('investment', 'transfer', 'other'))`,
    );
    total += sellAny.changes ?? 0;

    const cash = db.runSync(
      `UPDATE transactions
       SET type = 'transfer', tag = 'self_transfer', category = 'self_transfer'
       WHERE platform = 'ibkr'
         AND ${unlocked}
         AND (
           description LIKE '%CASH RECEIPTS%'
           OR description LIKE '%ELECTRONIC FUND TRANSFER%'
           OR description LIKE '%Deposits/Withdrawals%'
           OR description LIKE '%FUND TRANSFERS%'
           OR (
             (description LIKE '%Deposit%' OR description LIKE '%Withdrawal%')
             AND description NOT LIKE '%Dividend%'
           )
         )`,
    );
    total += cash.changes ?? 0;

    const div = db.runSync(
      `UPDATE transactions
       SET type = 'income', tag = 'dividend', category = 'dividend'
       WHERE platform = 'ibkr'
         AND ${unlocked}
         AND (description LIKE '%Dividend%' OR description LIKE '%DIVIDEND%')
         AND description NOT LIKE '%Withholding%'
         AND description NOT LIKE '%US TAX%'`,
    );
    total += div.changes ?? 0;

    const fee = db.runSync(
      `UPDATE transactions
       SET type = 'fee', tag = 'fee', category = 'fee'
       WHERE platform = 'ibkr'
         AND ${unlocked}
         AND (description LIKE '%Withholding%' OR description LIKE '%US TAX%' OR type = 'fee')`,
    );
    total += fee.changes ?? 0;

    const investType = db.runSync(
      `UPDATE transactions
       SET type = 'transfer'
       WHERE (tag = 'investment' OR (tag IS NULL AND category = 'investment'))
         AND type IN ('income', 'expense')
         AND description NOT LIKE 'SELL %'`,
    );
    total += investType.changes ?? 0;

    repairedThisSession = true;
    return total;
  } catch {
    return 0;
  }
}
