import type { Account } from '../types';
import { buildOwnAccountContext, isSelfTransfer } from './selfTransfer';

export type TagType =
  | 'entertainment'
  | 'utilities'
  | 'electronics'
  | 'self_transfer'
  | 'transfer'
  | 'top_up';

export const ALL_TAGS: TagType[] = [
  'entertainment', 'utilities', 'electronics', 'self_transfer', 'transfer', 'top_up',
];

// ─── MCC → Tag mapping ──────────────────────────────────────────────

const MCC_TO_TAG: Partial<Record<number, TagType>> = {
  // Entertainment: Restaurants & Bars
  5812: 'entertainment', 5813: 'entertainment', 5814: 'entertainment',
  // Entertainment: Cinemas, concerts, sports
  7832: 'entertainment', 7922: 'entertainment', 7941: 'entertainment',
  7991: 'entertainment', 7993: 'entertainment', 7994: 'entertainment',
  7995: 'entertainment', 7996: 'entertainment', 7999: 'entertainment',
  7011: 'entertainment',
  // Entertainment: Games & Books
  5945: 'entertainment', 5942: 'entertainment',
  5815: 'entertainment', 5816: 'entertainment', 5817: 'entertainment', 5818: 'entertainment',
  7372: 'entertainment', // software subscriptions
  5192: 'entertainment',
  // Utilities / Household: Groceries
  5411: 'utilities', 5412: 'utilities', 5441: 'utilities', 5451: 'utilities',
  5462: 'utilities', 5499: 'utilities',
  // Utilities: Pharmacies, health
  5912: 'utilities', 5122: 'utilities',
  // Utilities: Department & Clothing stores
  5311: 'utilities', 5331: 'utilities',
  5691: 'utilities', 5621: 'utilities', 5699: 'utilities',
  5661: 'utilities', 5631: 'utilities', 5651: 'utilities', 5310: 'utilities',
  // Utilities: Telecom & Energy
  4812: 'utilities', 4813: 'utilities', 4814: 'utilities', 4900: 'utilities',
  // Utilities: Auto & Transport
  5511: 'utilities', 7523: 'utilities', 7542: 'utilities', 5541: 'utilities',
  4111: 'utilities', 4112: 'utilities', 4121: 'utilities', 4131: 'utilities',
  // Utilities: Personal care, misc
  5977: 'utilities', 5085: 'utilities', 5251: 'utilities', 7299: 'utilities',
  // Electronics
  5065: 'electronics', 5734: 'electronics', 5045: 'electronics',
  5712: 'electronics', 5732: 'electronics', 5044: 'electronics',
  // Money transfer / P2P
  4829: 'transfer', 6012: 'transfer',
  // ATM / Cash / Top-up
  6011: 'top_up', 6010: 'top_up', 6050: 'top_up',
};

// ─── Description pattern → Tag mapping ─────────────────────────────

const DESC_PATTERNS: Array<{ pattern: RegExp; tag: TagType }> = [
  // Transfer / Cancellation first (highest priority)
  {
    pattern: /^Cancellation\.|^Скасування\./i,
    tag: 'transfer', // cancellation = counter-transfer
  },
  // Top-up patterns
  {
    pattern: /поповнення|пополнение|top.?up|зарахування|зарплат|deposit payout|cashback withdrawal|кешбек|easyp|city24|abnk/i,
    tag: 'top_up',
  },
  // Groceries / household
  {
    pattern: /атб|сільпо|novus|ашан|metro(?!polis)|billa|lidl|фора|таврія|varus|buslyk|буслик|наш крам|клас|auchan|silpo|aldi|gastronom|таврія|thrash|hastronom|pekarnya|buloshna/i,
    tag: 'utilities',
  },
  // Entertainment: games
  {
    pattern: /netflix|spotify|steam|steamgames|youtube|кіно|cinema|multiplex|imax|планета кіно|ukino|okko|megogo|xbox|playstation|google play|app store|apple tv|battlefield|clash of clans|roblox|minecraft|google.*music|youtube.*premium/i,
    tag: 'entertainment',
  },
  // Entertainment: restaurants/cafes
  {
    pattern: /mcdonalds|mcdonald|kebab|restaurant|кафе|ресторан|mushrooms|istanbul|pizza/i,
    tag: 'entertainment',
  },
  // Entertainment: cinemas
  {
    pattern: /multiplex|multypleks|kinopolis|planete|imax|kinogo|кіно/i,
    tag: 'entertainment',
  },
  // Electronics
  {
    pattern: /rozetka|comfy|allo|фокстрот|moyo|apple store|samsung store|xiaomi|eldorado|технополіс|re:store|brain|magazin brain/i,
    tag: 'electronics',
  },
  // Transfers
  {
    pattern: /переказ|transfer(?! processing)|відправлено на|перевод|p2p|card2card|transfer to card|from:/i,
    tag: 'transfer',
  },
];

// ─── Transaction type auto-detection ───────────────────────────────

/**
 * Determine the transaction type from MCC, description, and amount sign.
 * Returns 'income' | 'expense' | 'transfer' | 'fee'
 */
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

  if (isSelfTransfer(description, undefined, counterIban, ctx)) {
    return 'transfer';
  }

  // Commission / bank fee
  if (mcc === 0 || /commission|fee|processing fee/i.test(description ?? '')) {
    return 'fee';
  }

  // Self-transfer
  if (counterIban && ownIbans.includes(counterIban)) {
    return 'transfer';
  }

  // P2P / card transfer patterns
  if (/переказ|transfer to card|card2card|p2p/i.test(description ?? '')) {
    return 'transfer';
  }

  return amount >= 0 ? 'income' : 'expense';
}

// ─── Tag auto-detection ─────────────────────────────────────────────

/** Auto-detect a tag based on MCC, description, and own account IBANs. Returns undefined if no match. */
export function autoDetectTag(
  mcc: number | undefined,
  description: string | undefined,
  ownIbans: string[] = [],
  counterIban?: string,
  ownAccounts?: Account[],
): TagType | undefined {
  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  if (isSelfTransfer(description, undefined, counterIban, ctx)) {
    return 'self_transfer';
  }

  // Self-transfer: counterparty IBAN is in own accounts
  if (counterIban && counterIban.length > 5 && ctx.ibans.some((iban) => iban === counterIban)) {
    return 'self_transfer';
  }

  // MCC-based (check MCC first as it is more precise)
  if (mcc && mcc > 0) {
    const tag = MCC_TO_TAG[mcc];
    if (tag) return tag;
  }

  // Description-based (process in priority order)
  if (description) {
    for (const { pattern, tag } of DESC_PATTERNS) {
      if (pattern.test(description)) return tag;
    }
  }

  return undefined;
}

/** Re-apply auto-tag for a raw Monobank payload + own IBANs */
export function retagFromRawPayload(
  rawPayload: string,
  mcc: number | undefined,
  description: string | undefined,
  ownIbans: string[],
  ownAccounts?: Account[],
): TagType | undefined {
  try {
    const raw = JSON.parse(rawPayload) as { counterIban?: string };
    return autoDetectTag(mcc, description, ownIbans, raw.counterIban, ownAccounts);
  } catch {
    return autoDetectTag(mcc, description, ownIbans, undefined, ownAccounts);
  }
}
