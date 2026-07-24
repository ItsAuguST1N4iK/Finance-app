import type { Account, Platform } from '../types';
import type { CategoryKey } from './categoryRegistry';
import { autoDetectCategoryKey } from './categories';

/** Unified category assignment for import pipelines and re-tagging. */
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
}): CategoryKey {
  if (params.selfTransfer) return 'self_transfer';

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
    },
  );
}

export function categoryFields(key: CategoryKey): { tag: CategoryKey; category: CategoryKey } {
  return { tag: key, category: key };
}
