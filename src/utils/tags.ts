import type { Account } from '../types';
import { buildOwnAccountContext, isSelfTransfer } from './selfTransfer';
import type { CategoryKey } from './categoryRegistry';
import { ALL_CATEGORY_KEYS } from './categoryRegistry';

/** @deprecated Prefer CategoryKey / ALL_CATEGORY_KEYS */
export type TagType = CategoryKey;

/** @deprecated Prefer ALL_CATEGORY_KEYS */
export const ALL_TAGS: CategoryKey[] = [...ALL_CATEGORY_KEYS];

export function autoDetectType(
  amount: number,
  mcc: number | undefined,
  description: string | undefined,
  counterIban?: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
): 'income' | 'expense' | 'transfer' | 'fee' {
  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  if (isSelfTransfer(description, undefined, counterIban, ctx)) return 'transfer';
  if (mcc === 0 || /commission|fee|processing fee/i.test(description ?? '')) return 'fee';
  if (counterIban && ownIbans.includes(counterIban)) return 'transfer';
  if (/переказ|transfer to card|card2card|p2p/i.test(description ?? '')) return 'transfer';
  return amount >= 0 ? 'income' : 'expense';
}

/**
 * Only structural self-transfer detection remains here.
 * MCC / description scrapers live in category_rules (priority 0) via ensureScraperCategoryRules.
 */
export function autoDetectTag(
  mcc: number | undefined,
  description: string | undefined,
  ownIbans: string[] = [],
  counterIban?: string,
  ownAccounts?: Account[],
): CategoryKey | undefined {
  void mcc;
  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  if (isSelfTransfer(description, undefined, counterIban, ctx)) return 'self_transfer';
  if (counterIban && counterIban.length > 5 && ctx.ibans.some((iban) => iban === counterIban)) {
    return 'self_transfer';
  }

  return undefined;
}

export function retagFromRawPayload(
  rawPayload: string,
  mcc: number | undefined,
  description: string | undefined,
  ownIbans: string[],
  ownAccounts?: Account[],
): CategoryKey | undefined {
  try {
    const raw = JSON.parse(rawPayload) as { counterIban?: string };
    return autoDetectTag(mcc, description, ownIbans, raw.counterIban, ownAccounts);
  } catch {
    return autoDetectTag(mcc, description, ownIbans, undefined, ownAccounts);
  }
}
