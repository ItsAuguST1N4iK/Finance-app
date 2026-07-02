import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { AnalyticsSummary, PlatformShare, CategoryTotal, AnalyticsFilters, Platform } from '../types';
import { getDatabase } from '../db/migrations';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, getDaysInMonth } from 'date-fns';

export interface ChartBar {
  label: string;
  income: number;
  expense: number;
}

interface AnalyticsState {
  summary: AnalyticsSummary[];
  platformShares: PlatformShare[];
  topCategories: CategoryTotal[];
  chartBars: ChartBar[];
  filters: AnalyticsFilters;
  isLoading: boolean;
  homeCurrency: string;

  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  compute: () => void;
  loadHomeCurrency: () => void;
}

export function presetToDates(preset: AnalyticsFilters['periodPreset']): { dateFrom: number; dateTo: number } {
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
    case 'all':
      return { dateFrom: 0, dateTo: Date.now() };
    default:
      return { dateFrom: 0, dateTo: Date.now() };
  }
}

function buildDailyBars(
  db: ReturnType<typeof getDatabase>,
  where: string,
  params: SQLiteBindValue[],
  dateFrom: number,
): ChartBar[] {
  const rows = db.getAllSync<{ day: string; total_income: number; total_expense: number }>(
    `SELECT
       strftime('%d', datetime(transaction_date/1000, 'unixepoch')) AS day,
       SUM(CASE WHEN type='income' AND COALESCE(tag,'') != 'self_transfer' THEN amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN type='expense' AND COALESCE(tag,'') != 'self_transfer' THEN ABS(amount) ELSE 0 END) AS total_expense
     FROM transactions ${where}
     GROUP BY day
     ORDER BY day ASC`,
    params
  );
  const start = new Date(dateFrom);
  const totalDays = getDaysInMonth(start);
  const map: Record<string, ChartBar> = {};
  for (const r of rows) {
    map[r.day] = { label: r.day, income: r.total_income ?? 0, expense: r.total_expense ?? 0 };
  }
  return Array.from({ length: totalDays }, (_, i) => {
    const label = String(i + 1).padStart(2, '0');
    return map[label] ?? { label: String(i + 1), income: 0, expense: 0 };
  });
}

function buildMonthlyBars(
  db: ReturnType<typeof getDatabase>,
  where: string,
  params: SQLiteBindValue[]
): ChartBar[] {
  const rows = db.getAllSync<{ month: string; total_income: number; total_expense: number }>(
    `SELECT
       strftime('%m', datetime(transaction_date/1000, 'unixepoch')) AS month,
       SUM(CASE WHEN type='income' AND COALESCE(tag,'') != 'self_transfer' THEN amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN type='expense' AND COALESCE(tag,'') != 'self_transfer' THEN ABS(amount) ELSE 0 END) AS total_expense
     FROM transactions ${where}
     GROUP BY month
     ORDER BY month ASC`,
    params
  );
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const map: Record<string, ChartBar> = {};
  for (const r of rows) {
    map[r.month] = { label: MONTH_SHORT[parseInt(r.month, 10) - 1] ?? r.month, income: r.total_income ?? 0, expense: r.total_expense ?? 0 };
  }
  return Array.from({ length: 12 }, (_, i) => {
    const key = String(i + 1).padStart(2, '0');
    return map[key] ?? { label: MONTH_SHORT[i], income: 0, expense: 0 };
  });
}

const defaultFilters: AnalyticsFilters = {
  platforms: [],
  types: [],
  ...presetToDates('this_month'),
  periodPreset: 'this_month',
  excludeSelfTransfers: true,
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  summary: [],
  platformShares: [],
  topCategories: [],
  chartBars: [],
  filters: defaultFilters,
  isLoading: false,
  homeCurrency: 'UAH',

  loadHomeCurrency: () => {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<{ home_currency: string | null }>(
        'SELECT home_currency FROM settings WHERE id = 1'
      );
      if (row?.home_currency) {
        set({ homeCurrency: row.home_currency });
      }
    } catch {}
  },

  setFilters: (partial) => {
    const current = get().filters;
    const updated: AnalyticsFilters = { ...current, ...partial };

    // Only auto-calculate dates for standard presets, NOT for 'custom'
    if (partial.periodPreset && partial.periodPreset !== 'custom') {
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
      // 1. Monthly summaries — exclude self-transfers
      const summaryRows = db.getAllSync<Record<string, unknown>>(
        `SELECT
          platform,
          strftime('%Y-%m', datetime(transaction_date/1000, 'unixepoch')) AS period,
          currency,
          SUM(CASE WHEN type='income' AND COALESCE(tag,'') != 'self_transfer' THEN amount ELSE 0 END) AS total_income,
          SUM(CASE WHEN type='expense' AND COALESCE(tag,'') != 'self_transfer' THEN ABS(amount) ELSE 0 END) AS total_expense,
          SUM(fee_amount) AS total_fees,
          COUNT(*) AS tx_count
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

      // 2. Platform shares — exclude self-transfers
      const shareRows = db.getAllSync<Record<string, unknown>>(
        `SELECT
           platform,
           type,
           SUM(ABS(amount)) AS platform_total
         FROM transactions ${where} AND COALESCE(tag,'') != 'self_transfer'
         GROUP BY platform, type`,
        params
      );

      const totalByType: Record<string, number> = {};
      for (const r of shareRows) {
        const t = r.type as string;
        totalByType[t] = (totalByType[t] ?? 0) + (r.platform_total as number);
      }
      const platformShares: PlatformShare[] = shareRows
        .filter((r) => r.type === 'income' || r.type === 'expense')
        .map((r) => ({
          platform:      r.platform as Platform,
          type:          r.type as 'income' | 'expense',
          platformTotal: r.platform_total as number,
          sharePct: totalByType[r.type as string]
            ? Math.round((r.platform_total as number) / totalByType[r.type as string] * 10000) / 100
            : 0,
        }));

      // 3. Top expense categories
      const catConditions: string[] = [
        'transaction_date >= ?',
        'transaction_date <= ?',
      ];
      const catParams: SQLiteBindValue[] = [filters.dateFrom, filters.dateTo];

      if (filters.platforms.length > 0) {
        const catPh = filters.platforms.map(() => '?').join(',');
        catConditions.push(`platform IN (${catPh})`);
        catParams.push(...filters.platforms);
      }
      if (filters.currency) {
        catConditions.push('currency = ?');
        catParams.push(filters.currency);
      }
      catConditions.push("type = 'expense'");
      catConditions.push("COALESCE(tag,'') != 'self_transfer'");
      const catWhere = `WHERE ${catConditions.join(' AND ')}`;

      const catRows = db.getAllSync<Record<string, unknown>>(
        `SELECT
           COALESCE(tag, COALESCE(category, 'Інше')) AS category,
           SUM(ABS(amount)) AS total,
           COUNT(*) AS tx_count
         FROM transactions ${catWhere}
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

      // 4. Chart bars
      const { periodPreset } = filters;
      const isMonthPeriod = periodPreset === 'this_month' || periodPreset === 'last_month';
      const isYearPeriod  = periodPreset === 'this_year' || periodPreset === 'last_year';

      let chartBars: ChartBar[] = [];
      if (isMonthPeriod) {
        chartBars = buildDailyBars(db, where, params, filters.dateFrom);
      } else if (isYearPeriod) {
        chartBars = buildMonthlyBars(db, where, params);
      } else {
        chartBars = buildMonthlyBars(db, where, params);
      }

      set({ summary, platformShares, topCategories, chartBars, isLoading: false });
    } catch (e) {
      console.error('[analyticsSlice] compute error:', e);
      set({ isLoading: false });
    }
  },
}));
