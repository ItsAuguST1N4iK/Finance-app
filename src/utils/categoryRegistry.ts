/** Unified category keys — stored in transactions.tag and transactions.category */
export type CategoryKey =
  | 'food'
  | 'transport'
  | 'health'
  | 'clothing'
  | 'subscriptions'
  | 'entertainment'
  | 'utilities'
  | 'electronics'
  | 'income'
  | 'top_up'
  | 'transfer'
  | 'self_transfer'
  | 'other';

export const ALL_CATEGORY_KEYS: CategoryKey[] = [
  'food', 'transport', 'health', 'clothing', 'subscriptions',
  'entertainment', 'utilities', 'electronics',
  'income', 'top_up', 'transfer', 'self_transfer', 'other',
];

export const CATEGORY_I18N_KEY: Record<CategoryKey, string> = {
  food:           'catFood',
  transport:      'catTransport',
  health:         'catHealth',
  clothing:       'catClothing',
  subscriptions:  'catSubscriptions',
  entertainment:  'tagEntertainment',
  utilities:      'tagUtilities',
  electronics:    'tagElectronics',
  income:         'catIncome',
  top_up:         'tagTopUp',
  transfer:       'tagTransfer',
  self_transfer:  'tagSelfTransfer',
  other:          'catOther',
};

export function isCategoryKey(v: string | null | undefined): v is CategoryKey {
  return !!v && (ALL_CATEGORY_KEYS as string[]).includes(v);
}

export function normalizeCategoryKey(
  tag?: string | null,
  category?: string | null,
): CategoryKey {
  if (isCategoryKey(tag)) return tag;
  if (isCategoryKey(category)) return category;
  return 'other';
}
