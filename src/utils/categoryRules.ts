import { getDatabase } from '../db/migrations';
import type { CategoryKey } from './categoryRegistry';
import { isCategoryKey } from './categoryRegistry';
import type { Platform } from '../types';
import { ensureScraperCategoryRules } from './scraperCategoryRules';

export type RuleMatchField = 'mcc' | 'description' | 'amount' | 'platform' | 'type' | 'currency';
export type RuleMatchOp = 'contains' | 'equals' | 'regex' | 'range';

export interface CategoryRule {
  id: string;
  name: string;
  categoryKey: string;
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

/** All rules including disabled — for export / audit. */
export function loadAllCategoryRules(): CategoryRule[] {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM category_rules ORDER BY priority DESC, created_at ASC',
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
      if (needle.includes('|')) {
        return needle.split('|').some((part) => part.trim() && fieldVal.includes(part.trim()));
      }
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

export function matchCategoryByRules(tx: RuleMatchTx, rules?: CategoryRule[]): string | undefined {
  const list = rules ?? loadCategoryRules();
  for (const rule of list) {
    if (!rule.enabled) continue;
    if (matchRule(rule, tx)) return rule.categoryKey;
  }
  return undefined;
}

export interface MatchedRuleInfo {
  id: string;
  name: string;
  categoryKey: string;
  priority: number;
  matchField: RuleMatchField;
  matchOp: RuleMatchOp;
  matchValue: string;
  enabled: boolean;
  /** First enabled match in priority order — the rule that would assign the category */
  isWinner: boolean;
}

/** All rules that match a transaction (enabled evaluated for winner; disabled listed if they also match). */
export function findMatchingRules(tx: RuleMatchTx, rules?: CategoryRule[]): MatchedRuleInfo[] {
  const list = rules ?? loadAllCategoryRules();
  const matched: MatchedRuleInfo[] = [];
  let winnerId: string | null = null;

  for (const rule of list) {
    if (!matchRule(rule, tx)) continue;
    if (rule.enabled && winnerId == null) winnerId = rule.id;
    matched.push({
      id: rule.id,
      name: rule.name,
      categoryKey: rule.categoryKey,
      priority: rule.priority,
      matchField: rule.matchField,
      matchOp: rule.matchOp,
      matchValue: rule.matchValue,
      enabled: rule.enabled,
      isWinner: false,
    });
  }

  return matched.map((m) => ({ ...m, isWinner: m.id === winnerId }));
}

export function seedDefaultCategoryRules(): void {
  // Defaults are the scraper heuristics (priority 0) + essential IBKR rules.
  // No longer seed user-level Steam/Groceries copies.
  ensureScraperCategoryRules();
}

/** Ensure critical rules exist even when defaults were seeded earlier without them. */
export function ensureEssentialCategoryRules(): void {
  ensureScraperCategoryRules();
  const db = getDatabase();
  const essentials: Omit<CategoryRule, 'id'>[] = [
    { name: 'IBKR BUY', categoryKey: 'investment', priority: 25, matchField: 'description', matchOp: 'regex', matchValue: '^BUY ', enabled: true },
    { name: 'IBKR SELL', categoryKey: 'realized', priority: 90, matchField: 'description', matchOp: 'regex', matchValue: '^SELL ', enabled: true },
  ];
  for (const rule of essentials) {
    const exists = db.getFirstSync<{ c: number }>(
      'SELECT COUNT(*) as c FROM category_rules WHERE name = ?',
      [rule.name],
    );
    if ((exists?.c ?? 0) === 0) {
      saveCategoryRule(rule);
    } else {
      db.runSync(
        `UPDATE category_rules
         SET category_key = ?, priority = ?, match_field = ?, match_op = ?, match_value = ?, enabled = 1
         WHERE name = ?`,
        [rule.categoryKey, rule.priority, rule.matchField, rule.matchOp, rule.matchValue, rule.name],
      );
    }
  }

  // Disable legacy rules that tag SELL as investment (e.g. contains Buy|Sell)
  db.runSync(
    `UPDATE category_rules
     SET enabled = 0
     WHERE enabled = 1
       AND category_key = 'investment'
       AND LOWER(match_value) LIKE '%sell%'
       AND name NOT LIKE 'IBKR BUY%'
       AND id NOT LIKE 'rule_scraper_%'`,
  );
}

export function buildRuleDisplayName(
  matchField: RuleMatchField,
  matchOp: RuleMatchOp,
  matchValue: string,
  categoryKey: string,
): string {
  const val = matchValue.length > 24 ? `${matchValue.slice(0, 24)}…` : matchValue;
  return `${matchField} ${matchOp} "${val}" → ${categoryKey}`;
}
export function validateCategoryKey(key: string): CategoryKey {
  return isCategoryKey(key) ? key : 'other';
}
