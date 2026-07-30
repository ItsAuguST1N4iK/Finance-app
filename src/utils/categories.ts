import { autoDetectTag } from './tags';
import { matchCategoryByRules, type CategoryRule } from './categoryRules';
import type { CategoryKey } from './categoryRegistry';
import { isCategoryKey } from './categoryRegistry';
import type { Account, Platform } from '../types';

export interface CategoryDetectExtra {
  amount?: number;
  platform?: Platform;
  type?: string;
  currency?: string;
  ownAccounts?: Account[];
  counterIban?: string;
  rules?: CategoryRule[];
}

export interface EffectiveCategoryInput {
  tag?: string | null;
  category?: string | null;
  mcc?: number | null;
  description?: string | null;
  amount?: number;
  platform?: Platform;
  type?: string;
  currency?: string;
}

/** Too generic to trust as a pinned user choice — fall through on write-time detect only. */
const GENERIC_KEYS: CategoryKey[] = ['other', 'transfer'];

function isConcreteKey(key?: string | null): key is CategoryKey {
  return isCategoryKey(key) && !GENERIC_KEYS.includes(key);
}

function looksLikeInvestmentBuy(description?: string | null, platform?: Platform): boolean {
  const desc = (description ?? '').trim();
  if (!desc || /^SELL\b/i.test(desc)) return false;
  if (/^BUY\b/i.test(desc)) return true;
  if (/^TRADE\b/i.test(desc) && platform === 'ibkr') return true;
  if (platform === 'ibkr' && /\ @\ /.test(desc)) return true;
  return false;
}

function mapBankCategory(bank?: string | null): CategoryKey | undefined {
  const b = bank?.trim().toLowerCase();
  if (!b) return undefined;
  if (/dividend/.test(b)) return 'dividend';
  if (/надход|income|salary|зарплат/.test(b)) return 'income';
  if (/переказ|transfer/.test(b)) return 'transfer';
  if (/продукт|food|grocer/.test(b)) return 'food';
  if (/транспорт|transport/.test(b)) return 'transport';
  if (/здоров|health|апте/.test(b)) return 'health';
  if (/розваг|entertainment|кіно|ресторан/.test(b)) return 'entertainment';
  if (/одяг|clothing/.test(b)) return 'clothing';
  if (/комун|utilities/.test(b)) return 'utilities';
  if (/електрон|electronics/.test(b)) return 'electronics';
  if (/підпис|subscription/.test(b)) return 'subscriptions';
  return undefined;
}

export interface CategoryDetectParams {
  mcc?: number;
  description?: string;
  bankCategory?: string | null;
  ownIbans?: string[];
  ownAccounts?: Account[];
  counterIban?: string;
  platform?: Platform;
  type?: string;
  amount?: number;
  currency?: string;
}

/**
 * WRITE-TIME detection only (import / retag).
 * Never call this for UI labels — use storedCategoryKey so UI matches SQLite.
 */
export function detectCategoryFromSignals(
  params: CategoryDetectParams,
  rules?: CategoryRule[],
): string {
  const ownIbans = params.ownIbans ?? [];
  const ownAccounts = params.ownAccounts;

  // Structural exits (not editable scraper rules)
  if (/^SELL\b/i.test(params.description ?? '')) return 'realized';

  const selfDetected = autoDetectTag(
    params.mcc,
    params.description,
    ownIbans,
    params.counterIban,
    ownAccounts,
  );
  if (selfDetected === 'self_transfer') return 'self_transfer';

  if (
    params.platform === 'ibkr'
    && /CASH RECEIPTS|ELECTRONIC FUND TRANSFER|FUND TRANSFERS|Deposits\/Withdrawals/i.test(params.description ?? '')
  ) {
    return 'self_transfer';
  }

  if (looksLikeInvestmentBuy(params.description, params.platform)) return 'investment';

  // User rules (high priority) + scraper rules (priority 0) from category_rules
  const fromRule = matchCategoryByRules({
    mcc: params.mcc,
    description: params.description,
    amount: params.amount,
    platform: params.platform,
    type: params.type,
    currency: params.currency,
  }, rules);
  if (fromRule) return fromRule;

  if (params.type === 'fee') return 'fee';

  const fromBank = mapBankCategory(params.bankCategory);
  if (fromBank && fromBank !== 'transfer') return fromBank;

  if (params.type === 'income') return 'income';
  if (params.type === 'transfer') return 'transfer';

  return 'other';
}

/**
 * READ-TIME: what the UI / filters / analytics show.
 * Tag beats category. Accepts built-in keys and custom tag keys from SQLite.
 * Heuristics are NEVER used here — only on import/retag.
 */
export function storedCategoryKey(tx: {
  tag?: string | null;
  category?: string | null;
}): string {
  const tag = tx.tag?.trim();
  if (tag) return tag;
  const cat = tx.category?.trim();
  if (cat) return cat;
  return 'other';
}

/** Investment purchases — tracked in Investments KPI; also counted as cash expenses. */
export function isInvestmentPurchase(tx: EffectiveCategoryInput): boolean {
  if (/^SELL\b/i.test(tx.description ?? '')) return false;
  if (storedCategoryKey(tx) === 'investment') return true;
  if (/^BUY\b/i.test(tx.description ?? '')) return true;
  if (tx.platform === 'ibkr' && /^TRADE\b/i.test(tx.description ?? '')) return true;
  if (tx.platform === 'ibkr' && /\ @\ /.test(tx.description ?? '') && !/^SELL\b/i.test(tx.description ?? '')) {
    return true;
  }
  return false;
}

/** SELL / realized — tracked as realized; also counted as cash income. */
export function isInvestmentExit(tx: EffectiveCategoryInput): boolean {
  if (storedCategoryKey(tx) === 'realized') return true;
  return /^SELL\b/i.test(tx.description ?? '');
}

/** Filter: tag/category from DB only (tag wins). */
export function matchesCategoryFilter(
  tx: EffectiveCategoryInput,
  filterKey: string,
): boolean {
  return storedCategoryKey(tx) === filterKey;
}

/** SQL for investment rows — DB columns only (aligned with UI). */
export function investmentPurchaseSql(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `(${p}tag = 'investment' OR (${p}tag IS NULL AND ${p}category = 'investment'))`;
}

/** Import: respect explicit tag/category, else detect from signals. */
export function autoDetectCategoryKey(
  mcc?: number,
  description?: string,
  tag?: string | null,
  bankCategory?: string | null,
  ownIbans: string[] = [],
  extra?: CategoryDetectExtra,
): string {
  if (isConcreteKey(tag)) return tag;
  if (tag?.trim()) return tag.trim();
  if (isConcreteKey(bankCategory)) return bankCategory;

  return detectCategoryFromSignals({
    mcc,
    description,
    bankCategory,
    ownIbans,
    ownAccounts: extra?.ownAccounts,
    counterIban: extra?.counterIban,
    platform: extra?.platform,
    type: extra?.type,
    amount: extra?.amount,
    currency: extra?.currency,
  }, extra?.rules);
}

export function categoryFromZenType(txType?: string): CategoryKey | undefined {
  if (!txType) return undefined;
  const t = txType.trim();
  if (t === 'Incoming transfer') return 'income';
  if (t === 'Outgoing transfer') return 'transfer';
  return undefined;
}

export function resolveTransactionCategory(tx: {
  category?: string | null;
  tag?: string | null;
}): string {
  return storedCategoryKey(tx);
}

/** Bulk re-tag helper: detect from scratch and write tag + category. */
export function categoryForRetag(
  row: {
    mcc?: number | null;
    description?: string | null;
    raw_payload?: string | null;
    amount: number;
    platform: Platform;
    type: string;
    currency: string;
  },
  ownIbans: string[],
  ownAccounts: Account[],
  rules?: CategoryRule[],
): string {
  let counterIban: string | undefined;
  let bankCategory: string | undefined;

  if (row.raw_payload) {
    try {
      const raw = JSON.parse(row.raw_payload) as {
        counterIban?: string;
        bankCat?: string;
      };
      counterIban = raw.counterIban?.trim() || undefined;
      bankCategory = raw.bankCat?.trim() || undefined;
    } catch {}
  }

  return detectCategoryFromSignals({
    mcc: row.mcc ?? undefined,
    description: row.description ?? undefined,
    bankCategory,
    ownIbans,
    ownAccounts,
    counterIban,
    platform: row.platform,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
  }, rules);
}
