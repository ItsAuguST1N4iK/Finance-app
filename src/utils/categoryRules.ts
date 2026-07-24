import { getDatabase } from '../db/migrations';
import type { CategoryKey } from './categoryRegistry';
import { isCategoryKey } from './categoryRegistry';
import type { Platform } from '../types';

export type RuleMatchField = 'mcc' | 'description' | 'amount' | 'platform' | 'type' | 'currency';
export type RuleMatchOp = 'contains' | 'equals' | 'regex' | 'range';

export interface CategoryRule {
  id: string;
  name: string;
  categoryKey: CategoryKey;
  priority: number;
  matchField: RuleMatchField;
  matchOp: RuleMatchOp;
  matchValue: string;
  enabled: boolean;
}

export interface RuleMatchTx {
  mcc?: number;
  description?: string;
  amount?: number;
  platform?: Platform;
  type?: string;
  currency?: string;
}

function rowToRule(r: Record<string, unknown>): CategoryRule {
  return {
    id: r.id as string,
    name: r.name as string,
    categoryKey: r.category_key as CategoryKey,
    priority: r.priority as number,
    matchField: r.match_field as RuleMatchField,
    matchOp: r.match_op as RuleMatchOp,
    matchValue: r.match_value as string,
    enabled: (r.enabled as number) === 1,
  };
}

export function loadCategoryRules(): CategoryRule[] {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM category_rules WHERE enabled = 1 ORDER BY priority DESC, created_at ASC',
    );
    return rows.map(rowToRule);
  } catch {
    return [];
  }
}

export function saveCategoryRule(rule: Omit<CategoryRule, 'id'> & { id?: string }): string {
  const db = getDatabase();
  const id = rule.id ?? `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const existing = rule.id
    ? db.getFirstSync<{ created_at: number }>('SELECT created_at FROM category_rules WHERE id = ?', [rule.id])
    : null;
  const createdAt = existing?.created_at ?? Date.now();
  db.runSync(
    `INSERT OR REPLACE INTO category_rules
     (id, name, category_key, priority, match_field, match_op, match_value, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, rule.name, rule.categoryKey, rule.priority, rule.matchField, rule.matchOp,
     rule.matchValue, rule.enabled ? 1 : 0, createdAt],
  );
  return id;
}

export function deleteCategoryRule(id: string): void {
  getDatabase().runSync('DELETE FROM category_rules WHERE id = ?', [id]);
}

function matchRule(rule: CategoryRule, tx: RuleMatchTx): boolean {
  const raw = rule.matchValue;
  let fieldVal = '';
  switch (rule.matchField) {
    case 'mcc': fieldVal = String(tx.mcc ?? ''); break;
    case 'description': fieldVal = (tx.description ?? '').toLowerCase(); break;
    case 'amount': fieldVal = String(Math.abs(tx.amount ?? 0)); break;
    case 'platform': fieldVal = tx.platform ?? ''; break;
    case 'type': fieldVal = tx.type ?? ''; break;
    case 'currency': fieldVal = (tx.currency ?? '').toUpperCase(); break;
  }
  const needle = rule.matchField === 'description' ? raw.toLowerCase()
    : rule.matchField === 'currency' ? raw.toUpperCase()
    : raw;

  switch (rule.matchOp) {
    case 'contains':
      return fieldVal.includes(needle);
    case 'equals':
      return fieldVal === needle;
    case 'regex':
      try { return new RegExp(raw, 'i').test(fieldVal); } catch { return false; }
    case 'range': {
      const [lo, hi] = raw.split('-').map(Number);
      const n = Math.abs(tx.amount ?? 0);
      return !isNaN(lo) && !isNaN(hi) && n >= lo && n <= hi;
    }
    default:
      return false;
  }
}

export function matchCategoryByRules(tx: RuleMatchTx, rules?: CategoryRule[]): CategoryKey | undefined {
  const list = rules ?? loadCategoryRules();
  for (const rule of list) {
    if (matchRule(rule, tx)) return rule.categoryKey;
  }
  return undefined;
}

export function seedDefaultCategoryRules(): void {
  const db = getDatabase();
  const count = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM category_rules');
  if ((count?.c ?? 0) > 0) return;

  const defaults: Omit<CategoryRule, 'id'>[] = [
    { name: 'Steam/Games', categoryKey: 'entertainment', priority: 10, matchField: 'description', matchOp: 'regex', matchValue: 'steam|xbox|playstation', enabled: true },
    { name: 'Groceries', categoryKey: 'food', priority: 10, matchField: 'description', matchOp: 'regex', matchValue: 'атб|сільпо|novus|silpo', enabled: true },
    { name: 'Restaurants MCC', categoryKey: 'entertainment', priority: 8, matchField: 'mcc', matchOp: 'equals', matchValue: '5812', enabled: true },
    { name: 'Electronics MCC', categoryKey: 'electronics', priority: 8, matchField: 'mcc', matchOp: 'equals', matchValue: '5732', enabled: true },
  ];
  for (const d of defaults) saveCategoryRule(d);
}

export function buildRuleDisplayName(
  matchField: RuleMatchField,
  matchOp: RuleMatchOp,
  matchValue: string,
  categoryKey: CategoryKey,
): string {
  const val = matchValue.length > 24 ? `${matchValue.slice(0, 24)}…` : matchValue;
  return `${matchField} ${matchOp} "${val}" → ${categoryKey}`;
}
export function validateCategoryKey(key: string): CategoryKey {
  return isCategoryKey(key) ? key : 'other';
}
