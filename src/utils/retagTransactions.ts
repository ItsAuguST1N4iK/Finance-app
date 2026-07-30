import { getDatabase } from '../db/migrations';
import type { Account, Platform, TransactionType } from '../types';
import { categoryForRetag } from './categories';
import type { CategoryKey } from './categoryRegistry';
import { getCategoryImpact } from './categoryImpact';
import { ensureEssentialCategoryRules, loadCategoryRules } from './categoryRules';
import { repairIbkrInvestments } from './repairIbkr';
import { repairCurrencyMismatches } from './repairCurrency';

export interface RetagResult {
  changed: number;
  skippedLocked: number;
  total: number;
  byTag: Partial<Record<string, number>>;
  currencyFixed: number;
}

/** Keep SQLite `type` aligned with the assigned category tag. */
export function typeForCategory(cat: string, currentType: string): TransactionType {
  switch (cat) {
    case 'self_transfer':
      if (currentType === 'income' || currentType === 'expense') return currentType;
      return 'transfer';
    case 'transfer':
    case 'investment':
    case 'realized':
    case 'forex':
      return 'transfer';
    case 'cancellation':
      if (currentType === 'income' || currentType === 'expense' || currentType === 'fee') {
        return currentType;
      }
      return 'transfer';
    case 'fee':
      return 'fee';
    case 'income':
    case 'top_up':
    case 'dividend':
      return 'income';
    default: {
      const impact = getCategoryImpact(cat);
      if (impact === 'income') return 'income';
      if (impact === 'fee') return 'fee';
      if (impact === 'neutral') {
        if (currentType === 'income' || currentType === 'expense' || currentType === 'fee') {
          return currentType as TransactionType;
        }
        return 'transfer';
      }
      if (currentType === 'income') return 'income';
      if (currentType === 'fee') return 'fee';
      return 'expense';
    }
  }
}

/** Re-assign tag + category (+ type) for unlocked transactions only. */
export function retagAllTransactions(accounts: Account[]): RetagResult {
  ensureEssentialCategoryRules();
  repairIbkrInvestments();
  const currencyRepair = repairCurrencyMismatches();
  const currencyFixed = (currencyRepair.monoCsvFixed ?? 0)
    + currencyRepair.fixedToAccount
    + currencyRepair.reassignedAccount
    + currencyRepair.privatFxFixed
    + (currencyRepair.selfTransferTyped ?? 0);
  const rules = loadCategoryRules();
  const db = getDatabase();
  const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);

  const rows = db.getAllSync<{
    id: string;
    mcc: number | null;
    description: string | null;
    raw_payload: string | null;
    amount: number;
    platform: string;
    type: string;
    currency: string;
    tag: string | null;
    category: string | null;
    category_locked: number | null;
  }>(
    `SELECT id, mcc, description, raw_payload, amount, platform, type, currency,
            tag, category, category_locked
     FROM transactions`,
  );

  let changed = 0;
  let skippedLocked = 0;
  db.withTransactionSync(() => {
    for (const row of rows) {
      if (row.category_locked) {
        skippedLocked++;
        continue;
      }
      const catKey = categoryForRetag(
        { ...row, platform: row.platform as Platform },
        ownIbans,
        accounts,
        rules,
      );
      const nextType = typeForCategory(catKey, row.type);
      if (row.tag === catKey && row.category === catKey && row.type === nextType) {
        continue;
      }
      db.runSync(
        'UPDATE transactions SET tag = ?, category = ?, type = ? WHERE id = ?',
        [catKey, catKey, nextType, row.id],
      );
      changed++;
    }
  });

  // Final pass: SELL must never remain investment (overrides Buy|Sell user rules)
  repairIbkrInvestments();

  const counts = db.getAllSync<{ tag: string | null; c: number }>(
    `SELECT tag, COUNT(*) as c FROM transactions GROUP BY tag ORDER BY c DESC`,
  );
  const byTag: Partial<Record<CategoryKey, number>> = {};
  for (const row of counts) {
    if (row.tag) byTag[row.tag as CategoryKey] = row.c;
  }

  return { changed, skippedLocked, total: rows.length, byTag, currencyFixed };
}
