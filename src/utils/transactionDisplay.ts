import type { UnifiedTransaction } from '../types';
import type { AppTheme } from '../theme';
import { storedCategoryKey } from './categories';
import { getCategoryImpact } from './categoryImpact';
import type { CategoryKey } from './categoryRegistry';

const MUTED_CATEGORIES: CategoryKey[] = [
  'self_transfer', 'cancellation', 'forex',
];

export interface AmountDisplay {
  sign: string;
  color: string;
  muted: boolean;
}

function resolveSign(item: UnifiedTransaction, cat: string): string {
  const desc = item.description ?? '';
  const txType = item.type;
  if (/^SELL\b/i.test(desc) || cat === 'realized') return '+';
  if (/^BUY\b/i.test(desc) || cat === 'investment') return '−';
  if (cat === 'forex') return '−';
  if (cat === 'cancellation') return txType === 'income' ? '+' : '−';

  const impact = getCategoryImpact(cat);
  if (impact === 'income' || txType === 'income') return '+';
  if (impact === 'expense' || impact === 'fee' || txType === 'expense' || txType === 'fee') return '−';
  if (/deposit|receipt|CASH RECEIPTS|Dividend/i.test(desc)) return '+';
  if (/withdrawal|Withholding/i.test(desc)) return '−';
  if (txType === 'transfer') return '−';
  return txType === 'income' ? '+' : '−';
}

function resolveColor(item: UnifiedTransaction, cat: string, theme: AppTheme, muted: boolean): string {
  if (muted) return theme.subtext;
  if (/^SELL\b/i.test(item.description ?? '') || cat === 'realized') return theme.income;
  if (/^BUY\b/i.test(item.description ?? '') || cat === 'investment') return theme.expense;
  if (cat === 'forex') return theme.accent;

  const impact = getCategoryImpact(cat);
  if (impact === 'income' || item.type === 'income') return theme.income;
  if (impact === 'expense' || impact === 'fee' || item.type === 'expense' || item.type === 'fee') return theme.expense;
  if (cat === 'transfer' || impact === 'neutral') return theme.accent;
  return theme.text;
}

export function getTransactionAmountDisplay(
  item: UnifiedTransaction,
  theme: AppTheme,
): AmountDisplay {
  const cat = storedCategoryKey(item);
  const muted = (MUTED_CATEGORIES as string[]).includes(cat);
  const sign = resolveSign(item, cat);
  const color = resolveColor(item, cat, theme, muted);
  return { sign, color, muted };
}

export { isInvestmentPurchase } from './categories';
