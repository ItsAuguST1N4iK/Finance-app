import type { Account, Platform } from '../types';
import type { CategoryKey } from './categoryRegistry';
import { autoDetectCategoryKey } from './categories';
import type { CategoryRule } from './categoryRules';

/** Cached rules for the current import batch — avoids SQLite on every row. */
let importRulesCache: CategoryRule[] | null = null;

export function setImportCategoryRulesCache(rules: CategoryRule[] | null): void {
  importRulesCache = rules;
}

export function getImportCategoryRulesCache(): CategoryRule[] | null {
  return importRulesCache;
}

/** Unified category assignment for import pipelines. Rules/scrapers run here only. */
export function resolveImportCategory(params: {
  mcc?: number;
  description?: string;
  bankCategory?: string | null;
  ownIbans?: string[];
  ownAccounts?: Account[];
  counterIban?: string;
  amount?: number;
  platform?: Platform;
  type?: string;
  currency?: string;
  selfTransfer?: boolean;
  /** Prefer batch cache; fall back to empty (caller should prepare cache). */
  rules?: CategoryRule[];
}): string {
  if (params.selfTransfer) return 'self_transfer';

  const rules = params.rules ?? importRulesCache ?? undefined;

  return autoDetectCategoryKey(
    params.mcc,
    params.description,
    undefined,
    params.bankCategory,
    params.ownIbans ?? [],
    {
      amount: params.amount,
      platform: params.platform,
      type: params.type,
      currency: params.currency,
      ownAccounts: params.ownAccounts,
      counterIban: params.counterIban,
      rules,
    },
  );
}

export function categoryFields(key: string): { tag: string; category: string } {
  return { tag: key, category: key };
}
