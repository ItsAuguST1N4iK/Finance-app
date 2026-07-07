import type { TagType } from './tags';
import { autoDetectTag } from './tags';

/** Human-readable expense category labels (Ukrainian). */
export const TAG_CATEGORY_UK: Record<TagType, string> = {
  entertainment: 'Розваги',
  utilities:     'Продукти та побут',
  electronics:   'Електроніка',
  self_transfer: 'Перекази між рахунками',
  transfer:      'Перекази',
  top_up:        'Поповнення',
};

const ZEN_TYPE_CATEGORY: Record<string, string> = {
  'Incoming transfer': 'Надходження',
  'Outgoing transfer': 'Перекази',
};

/** Derive display category for a transaction. */
export function autoDetectCategory(
  mcc?: number,
  description?: string,
  tag?: string | null,
  bankCategory?: string | null,
  ownIbans: string[] = [],
): string {
  const bank = bankCategory?.trim();
  if (bank) return bank;

  const effectiveTag = (tag as TagType | undefined)
    ?? autoDetectTag(mcc, description, ownIbans);

  if (effectiveTag && effectiveTag in TAG_CATEGORY_UK) {
    return TAG_CATEGORY_UK[effectiveTag];
  }

  return 'Інше';
}

export function categoryFromZenType(txType?: string): string | undefined {
  if (!txType) return undefined;
  return ZEN_TYPE_CATEGORY[txType.trim()];
}

export function resolveTransactionCategory(tx: {
  category?: string | null;
  tag?: string | null;
  mcc?: number | null;
  description?: string | null;
}): string {
  if (tx.category?.trim()) return tx.category.trim();
  return autoDetectCategory(
    tx.mcc ?? undefined,
    tx.description ?? undefined,
    tx.tag,
  );
}
