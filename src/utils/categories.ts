import { autoDetectTag } from './tags';
import { matchCategoryByRules } from './categoryRules';
import type { CategoryKey } from './categoryRegistry';
import { isCategoryKey, normalizeCategoryKey } from './categoryRegistry';
import type { Platform } from '../types';

export interface CategoryDetectExtra {
  amount?: number;
  platform?: Platform;
  type?: string;
  currency?: string;
}

/** Derive unified category key for a transaction. */
export function autoDetectCategoryKey(
  mcc?: number,
  description?: string,
  tag?: string | null,
  bankCategory?: string | null,
  ownIbans: string[] = [],
  extra?: CategoryDetectExtra,
): CategoryKey {
  if (isCategoryKey(tag)) return tag;

  const fromRule = matchCategoryByRules({
    mcc, description, amount: extra?.amount, platform: extra?.platform,
    type: extra?.type, currency: extra?.currency,
  });
  if (fromRule) return fromRule;

  const bank = bankCategory?.trim().toLowerCase();
  if (bank) {
    if (/надход|income|salary|зарплат/.test(bank)) return 'income';
    if (/переказ|transfer/.test(bank)) return 'transfer';
    if (/продукт|food|grocer/.test(bank)) return 'food';
    if (/транспорт|transport/.test(bank)) return 'transport';
    if (/здоров|health|апте/.test(bank)) return 'health';
  }

  const detected = autoDetectTag(mcc, description, ownIbans);
  if (detected && isCategoryKey(detected)) return detected;

  return 'other';
}

/** @deprecated use category key + useCategoryLabels */
export function autoDetectCategory(
  mcc?: number,
  description?: string,
  tag?: string | null,
  bankCategory?: string | null,
  ownIbans: string[] = [],
): string {
  return autoDetectCategoryKey(mcc, description, tag, bankCategory, ownIbans);
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
  mcc?: number | null;
  description?: string | null;
}): CategoryKey {
  return normalizeCategoryKey(tx.tag, tx.category);
}
