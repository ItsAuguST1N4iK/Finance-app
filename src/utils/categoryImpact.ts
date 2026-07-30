import type { CategoryKey } from './categoryRegistry';
import {
  ALL_CATEGORY_KEYS,
  CATEGORY_CHIP_COLOR,
  CATEGORY_I18N_KEY,
  isCategoryKey,
} from './categoryRegistry';
import { getDatabase } from '../db/migrations';

/** P&L impact: expense=outcome, income, fee=charge, neutral=null/ignore */
export type CategoryImpact = 'expense' | 'income' | 'fee' | 'neutral';

/** Built-in impact map (before user overrides). */
export const BUILTIN_CATEGORY_IMPACT: Record<CategoryKey, CategoryImpact> = {
  food: 'expense',
  transport: 'expense',
  health: 'expense',
  clothing: 'expense',
  subscriptions: 'expense',
  entertainment: 'expense',
  utilities: 'expense',
  electronics: 'expense',
  income: 'income',
  top_up: 'income',
  transfer: 'neutral',
  self_transfer: 'neutral',
  cancellation: 'neutral',
  investment: 'expense',
  realized: 'income',
  dividend: 'income',
  fee: 'fee',
  forex: 'neutral',
  other: 'expense',
};

export interface CustomCategory {
  id: string;
  key: string;
  name: string;
  color: string;
  impact: CategoryImpact;
  createdAt: number;
}

/** Unified row for settings list (builtin ± override, or pure custom). */
export interface EditableCategory {
  id: string | null;
  key: string;
  name: string;
  color: string;
  impact: CategoryImpact;
  isBuiltin: boolean;
}

export function loadCustomCategories(): CustomCategory[] {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      key: string;
      name: string;
      color: string;
      impact: CategoryImpact;
      created_at: number;
    }>('SELECT * FROM custom_categories ORDER BY created_at ASC');
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      color: r.color,
      impact: (r.impact === 'fee' ? 'fee' : r.impact) as CategoryImpact,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export function saveCustomCategory(input: {
  id?: string;
  key?: string;
  name: string;
  color: string;
  impact: CategoryImpact;
}): string {
  const db = getDatabase();
  const key = (input.key ?? slugify(input.name)).slice(0, 40);

  let id = input.id;
  let createdAt = Date.now();
  if (id) {
    const existing = db.getFirstSync<{ created_at: number }>(
      'SELECT created_at FROM custom_categories WHERE id = ?',
      [id],
    );
    if (existing) createdAt = existing.created_at;
  } else {
    const byKey = db.getFirstSync<{ id: string; created_at: number }>(
      'SELECT id, created_at FROM custom_categories WHERE key = ?',
      [key],
    );
    if (byKey) {
      id = byKey.id;
      createdAt = byKey.created_at;
    } else {
      id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  db.runSync(
    `INSERT OR REPLACE INTO custom_categories (id, key, name, color, impact, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, key, input.name.trim(), input.color, input.impact, createdAt],
  );
  refreshCustomCategoryCache();
  return id!;
}

export function deleteCustomCategory(id: string): void {
  getDatabase().runSync('DELETE FROM custom_categories WHERE id = ?', [id]);
  refreshCustomCategoryCache();
}

export function deleteCategoryByKey(key: string): void {
  getDatabase().runSync('DELETE FROM custom_categories WHERE key = ?', [key]);
  if (isCategoryKey(key)) {
    hideBuiltinCategory(key);
  }
  refreshCustomCategoryCache();
}

export function hideBuiltinCategory(key: string): void {
  try {
    getDatabase().runSync(
      'INSERT OR REPLACE INTO hidden_categories (key) VALUES (?)',
      [key],
    );
  } catch { /* table may not exist yet */ }
}

export function unhideBuiltinCategory(key: string): void {
  try {
    getDatabase().runSync('DELETE FROM hidden_categories WHERE key = ?', [key]);
  } catch { /* ignore */ }
}

export function loadHiddenCategoryKeys(): Set<string> {
  try {
    const rows = getDatabase().getAllSync<{ key: string }>('SELECT key FROM hidden_categories');
    return new Set(rows.map((r) => r.key));
  } catch {
    return new Set();
  }
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґё]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24) || 'custom';
  return `custom_${base}_${Math.random().toString(36).slice(2, 5)}`;
}

const customImpactCache = new Map<string, CategoryImpact>();
const customColorCache = new Map<string, string>();
const customNameCache = new Map<string, string>();
let hiddenKeysCache: Set<string> | null = null;

export function refreshCustomCategoryCache(): void {
  customImpactCache.clear();
  customColorCache.clear();
  customNameCache.clear();
  hiddenKeysCache = null;
  for (const c of loadCustomCategories()) {
    customImpactCache.set(c.key, c.impact);
    customColorCache.set(c.key, c.color);
    customNameCache.set(c.key, c.name);
  }
}

export function getCategoryImpact(key: string | null | undefined): CategoryImpact {
  if (!key) return 'expense';
  if (customImpactCache.has(key)) return customImpactCache.get(key)!;
  if (isCategoryKey(key)) return BUILTIN_CATEGORY_IMPACT[key];
  if (customImpactCache.size === 0) {
    refreshCustomCategoryCache();
    if (customImpactCache.has(key)) return customImpactCache.get(key)!;
  }
  return 'expense';
}

export function getCategoryColor(key: string): string {
  if (customColorCache.has(key)) return customColorCache.get(key)!;
  if (isCategoryKey(key)) return CATEGORY_CHIP_COLOR[key];
  if (customColorCache.size === 0) {
    refreshCustomCategoryCache();
    if (customColorCache.has(key)) return customColorCache.get(key)!;
  }
  return '#78716c';
}

export function getCustomCategoryName(key: string): string | undefined {
  if (customNameCache.has(key)) return customNameCache.get(key);
  if (customNameCache.size === 0) {
    refreshCustomCategoryCache();
    return customNameCache.get(key);
  }
  return undefined;
}

function hiddenKeys(): Set<string> {
  if (!hiddenKeysCache) hiddenKeysCache = loadHiddenCategoryKeys();
  return hiddenKeysCache;
}

/**
 * Categories for settings dropdown: builtins (unless hidden) with overrides + pure customs.
 */
export function loadEditableCategories(
  resolveBuiltinName: (key: CategoryKey) => string,
): EditableCategory[] {
  refreshCustomCategoryCache();
  const customs = loadCustomCategories();
  const byKey = new Map(customs.map((c) => [c.key, c]));
  const hidden = hiddenKeys();
  const out: EditableCategory[] = [];

  for (const key of ALL_CATEGORY_KEYS) {
    if (hidden.has(key)) continue;
    const override = byKey.get(key);
    out.push({
      id: override?.id ?? null,
      key,
      name: override?.name ?? resolveBuiltinName(key),
      color: override?.color ?? CATEGORY_CHIP_COLOR[key],
      impact: override?.impact ?? BUILTIN_CATEGORY_IMPACT[key],
      isBuiltin: true,
    });
  }

  for (const c of customs) {
    if (isCategoryKey(c.key)) continue; // already listed as builtin override
    out.push({
      id: c.id,
      key: c.key,
      name: c.name,
      color: c.color,
      impact: c.impact,
      isBuiltin: false,
    });
  }

  return out;
}

/** All keys available for pickers: builtins (visible) + custom. */
export function allCategoryKeysForPicker(): string[] {
  refreshCustomCategoryCache();
  const hidden = hiddenKeys();
  const custom = loadCustomCategories().map((c) => c.key);
  const builtins = ALL_CATEGORY_KEYS.filter((k) => !hidden.has(k));
  const extra = custom.filter((k) => !isCategoryKey(k));
  return [...builtins, ...extra];
}

export { CATEGORY_I18N_KEY };
