import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { AnalyticsSummary, PlatformShare, CategoryTotal, AnalyticsFilters, Platform } from '../types';
import { getDatabase } from '../db/migrations';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Аналітика рахується напряму в SQLite — GROUP BY platform / DATE.
 * Результати кешуються на 30 хвилин (analytics_cache таблиця).
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 хвилин

interface AnalyticsState {
  summary: AnalyticsSummary[];
  platformShares: PlatformShare[];
  topCategories: CategoryTotal[];
  filters: AnalyticsFilters;
  isLoading: boolean;

  /** Встановити фільтри і перерахувати аналітику */
  setFilters: (filters: Partial<AnalyticsFilters>) => void;

  /** Завантажити аналітику з SQLite (або з кешу) */
  compute: () => void;
}

/** Перетворити preset у dateFrom / dateTo */
function presetToDates(preset: AnalyticsFilters['periodPreset']): { dateFrom: number; dateTo: number } {
  const now = new Date();
  switch (preset) {
    case 'this_month':
      return { dateFrom: startOfMonth(now).getTime(), dateTo: endOfMonth(now).getTime() };
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { dateFrom: startOfMonth(lm).getTime(), dateTo: endOfMonth(lm).getTime() };
    }
    case 'this_year':
      return { dateFrom: startOfYear(now).getTime(), dateTo: endOfYear(now).getTime() };
    case 'last_year': {
      const ly = new Date(now.getFullYear() - 1, 0, 1);
      return { dateFrom: startOfYear(ly).getTime(), dateTo: endOfYear(ly).getTime() };
    }
    default:
      return { dateFrom: 0, dateTo: Date.now() };
  }
}

const defaultFilters: AnalyticsFilters = {
  platforms: [],
  types: [],
  ...presetToDates('this_month'),
  periodPreset: 'this_month',
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  summary: [],
  platformShares: [],
  topCategories: [],
  filters: defaultFilters,
  isLoading: false,

  setFilters: (partial) => {
    const current = get().filters;
    const updated: AnalyticsFilters = { ...current, ...partial };

    // Якщо встановлено пресет — перераховуємо дати
    if (partial.periodPreset) {
      const dates = presetToDates(partial.periodPreset);
      updated.dateFrom = dates.dateFrom;
      updated.dateTo   = dates.dateTo;
    }

    set({ filters: updated });
    get().compute();
  },

  compute: () => {
    set({ isLoading: true });
    const { filters } = get();
    const db = getDatabase();

    // Будуємо WHERE умови
    const conditions: string[] = [
      'transaction_date >= ?',
      'transaction_date <= ?',
    ];
    const params: SQLiteBindValue[] = [filters.dateFrom, filters.dateTo];

    if (filters.platforms.length > 0) {
      const placeholders = filters.platforms.map(() => '?').join(',');
      conditions.push(`platform IN (${placeholders})`);
      params.push(...filters.platforms);
    }
    if (filters.types.length > 0) {
      const placeholders = filters.types.map(() => '?').join(',');
      conditions.push(`type IN (${placeholders})`);
      params.push(...filters.types);
    }
    if (filters.currency) {
      conditions.push('currency = ?');
      params.push(filters.currency);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    try {
      // 1. Місячні підсумки по платформах
      const summaryRows = db.getAllSync<Record<string, unknown>>(
        `SELECT
          platform,
          strftime('%Y-%m', datetime(transaction_date/1000, 'unixepoch')) AS period,
          currency,
          SUM(CASE WHEN type='income'  THEN amount ELSE 0 END)        AS total_income,
          SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END)   AS total_expense,
          SUM(fee_amount)                                              AS total_fees,
          COUNT(*)                                                     AS tx_count
         FROM transactions ${where}
         GROUP BY platform, period, currency
         ORDER BY period DESC`,
        params
      );

      const summary: AnalyticsSummary[] = summaryRows.map((r) => ({
        platform:     r.platform as Platform,
        period:       r.period as string,
        currency:     r.currency as string,
        totalIncome:  r.total_income as number,
        totalExpense: r.total_expense as number,
        totalFees:    r.total_fees as number,
        netResult:    (r.total_income as number) - (r.total_expense as number) - (r.total_fees as number),
        txCount:      r.tx_count as number,
      }));

      // 2. Частка платформ (простий варіант без CTE)
      const shareRows = db.getAllSync<Record<string, unknown>>(
        `SELECT
           platform,
           type,
           SUM(ABS(amount)) AS platform_total
         FROM transactions ${where}
         GROUP BY platform, type`,
        params
      );

      // Рахуємо частки в JS
      const totalByType: Record<string, number> = {};
      for (const r of shareRows) {
        const t = r.type as string;
        totalByType[t] = (totalByType[t] ?? 0) + (r.platform_total as number);
      }
      const platformShares: PlatformShare[] = shareRows.map((r) => ({
        platform:      r.platform as Platform,
        type:          r.type as 'income' | 'expense',
        platformTotal: r.platform_total as number,
        sharePct: totalByType[r.type as string]
          ? Math.round((r.platform_total as number) / totalByType[r.type as string] * 10000) / 100
          : 0,
      }));

      // 3. Топ категорій витрат
      const catParams: SQLiteBindValue[] = [...params, 'expense'];
      const catRows = db.getAllSync<Record<string, unknown>>(
        `SELECT
           COALESCE(category, 'Інше') AS category,
           SUM(ABS(amount))           AS total,
           COUNT(*)                   AS tx_count
         FROM transactions
         ${where} AND type = ?
         GROUP BY category
         ORDER BY total DESC
         LIMIT 10`,
        catParams
      );

      const topCategories: CategoryTotal[] = catRows.map((r) => ({
        category: r.category as string,
        total:    r.total as number,
        txCount:  r.tx_count as number,
      }));

      set({ summary, platformShares, topCategories, isLoading: false });
    } catch (e) {
      console.error('[analyticsSlice] compute error:', e);
      set({ isLoading: false });
    }
  },
}));
