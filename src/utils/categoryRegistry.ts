/** Unified category keys — stored in transactions.tag (priority) and transactions.category */
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
  | 'cancellation'
  | 'investment'
  | 'realized'
  | 'dividend'
  | 'fee'
  | 'forex'
  | 'other';

export const ALL_CATEGORY_KEYS: CategoryKey[] = [
  'food', 'transport', 'health', 'clothing', 'subscriptions',
  'entertainment', 'utilities', 'electronics',
  'income', 'top_up', 'transfer', 'self_transfer', 'cancellation',
  'investment', 'realized', 'dividend', 'fee', 'forex', 'other',
];
/** Categories shown in transaction filters (current taxonomy). */
export const FILTER_CATEGORY_KEYS: CategoryKey[] = [...ALL_CATEGORY_KEYS];

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
  cancellation:   'tagCancellation',
  investment:     'tagInvestment',
  realized:       'tagRealized',
  dividend:       'tagDividend',
  fee:            'tagFee',
  forex:          'tagForex',
  other:          'catOther',
};

/** Distinct chip colors so tags are visually obvious in the list. */
export const CATEGORY_CHIP_COLOR: Record<CategoryKey, string> = {
  food:           '#22c55e',
  transport:      '#3b82f6',
  health:         '#ef4444',
  clothing:       '#ec4899',
  subscriptions:  '#8b5cf6',
  entertainment:  '#f59e0b',
  utilities:      '#06b6d4',
  electronics:    '#6366f1',
  income:         '#10b981',
  top_up:         '#14b8a6',
  transfer:       '#94a3b8',
  self_transfer:  '#64748b',
  cancellation:   '#a8a29e',
  investment:     '#f97316',
  realized:       '#22c55e',
  dividend:       '#84cc16',
  fee:            '#eab308',
  forex:          '#0ea5e9',
  other:          '#78716c',
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
