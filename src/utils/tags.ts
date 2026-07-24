import type { Account } from '../types';
import { buildOwnAccountContext, isSelfTransfer } from './selfTransfer';
import type { CategoryKey } from './categoryRegistry';

/** @deprecated use CategoryKey / ALL_CATEGORY_KEYS */
export type TagType = CategoryKey;

/** @deprecated use ALL_CATEGORY_KEYS */
export const ALL_TAGS: CategoryKey[] = [
  'food', 'transport', 'health', 'clothing', 'subscriptions',
  'entertainment', 'utilities', 'electronics',
  'self_transfer', 'transfer', 'top_up', 'income', 'other',
];

const MCC_TO_CATEGORY: Partial<Record<number, CategoryKey>> = {
  5812: 'entertainment', 5813: 'entertainment', 5814: 'entertainment',
  7832: 'entertainment', 7922: 'entertainment', 7941: 'entertainment',
  7991: 'entertainment', 7993: 'entertainment', 7994: 'entertainment',
  7995: 'entertainment', 7996: 'entertainment', 7999: 'entertainment',
  7011: 'entertainment',
  5945: 'entertainment', 5942: 'entertainment',
  5815: 'entertainment', 5816: 'entertainment', 5817: 'entertainment', 5818: 'entertainment',
  5192: 'entertainment',
  5411: 'food', 5412: 'food', 5441: 'food', 5451: 'food', 5462: 'food', 5499: 'food',
  5912: 'health', 5122: 'health',
  5311: 'clothing', 5331: 'clothing', 5691: 'clothing', 5621: 'clothing',
  5699: 'clothing', 5661: 'clothing', 5631: 'clothing', 5651: 'clothing', 5310: 'clothing',
  4812: 'utilities', 4813: 'utilities', 4814: 'utilities', 4900: 'utilities',
  5977: 'utilities', 5085: 'utilities', 5251: 'utilities', 7299: 'utilities',
  5511: 'transport', 7523: 'transport', 7542: 'transport', 5541: 'transport',
  4111: 'transport', 4112: 'transport', 4121: 'transport', 4131: 'transport',
  7372: 'subscriptions',
  5065: 'electronics', 5734: 'electronics', 5045: 'electronics',
  5712: 'electronics', 5732: 'electronics', 5044: 'electronics',
  4829: 'transfer', 6012: 'transfer',
  6011: 'top_up', 6010: 'top_up', 6050: 'top_up',
};

const DESC_PATTERNS: Array<{ pattern: RegExp; category: CategoryKey }> = [
  { pattern: /^Cancellation\.|^Скасування\./i, category: 'transfer' },
  {
    pattern: /поповнення|пополнение|top.?up|зарахування|зарплат|deposit payout|cashback withdrawal|кешбек|easyp|city24|abnk/i,
    category: 'top_up',
  },
  {
    pattern: /атб|сільпо|novus|ашан|metro(?!polis)|billa|lidl|фора|таврія|varus|buslyk|буслик|наш крам|клас|auchan|silpo|aldi|gastronom|thrash|hastronom|pekarnya|buloshna/i,
    category: 'food',
  },
  {
    pattern: /netflix|spotify|youtube.*premium|google.*music|apple tv|subscription|підписк/i,
    category: 'subscriptions',
  },
  {
    pattern: /steam|steamgames|xbox|playstation|google play|app store|battlefield|clash of clans|roblox|minecraft/i,
    category: 'entertainment',
  },
  {
    pattern: /mcdonalds|mcdonald|kebab|restaurant|кафе|ресторан|mushrooms|istanbul|pizza|кіно|cinema|multiplex|imax|планета кіно|ukino|okko|megogo|kinopolis|planete|kinogo/i,
    category: 'entertainment',
  },
  {
    pattern: /rozetka|comfy|allo|фокстрот|moyo|apple store|samsung store|xiaomi|eldorado|технополіс|re:store|brain|magazin brain/i,
    category: 'electronics',
  },
  {
    pattern: /uber|bolt|uklon|метро|залізниц|railway|petrol|okko fuel|wog|socar|shell|azs|автобус/i,
    category: 'transport',
  },
  {
    pattern: /аптек|pharmacy|drug store|medical|клінік|hospital/i,
    category: 'health',
  },
  {
    pattern: /переказ|transfer(?! processing)|відправлено на|перевод|p2p|card2card|transfer to card|from:/i,
    category: 'transfer',
  },
];

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

export function autoDetectTag(
  mcc: number | undefined,
  description: string | undefined,
  ownIbans: string[] = [],
  counterIban?: string,
  ownAccounts?: Account[],
): CategoryKey | undefined {
  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  if (isSelfTransfer(description, undefined, counterIban, ctx)) return 'self_transfer';
  if (counterIban && counterIban.length > 5 && ctx.ibans.some((iban) => iban === counterIban)) {
    return 'self_transfer';
  }

  if (mcc && mcc > 0) {
    const cat = MCC_TO_CATEGORY[mcc];
    if (cat) return cat;
  }

  if (description) {
    for (const { pattern, category } of DESC_PATTERNS) {
      if (pattern.test(description)) return category;
    }
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
