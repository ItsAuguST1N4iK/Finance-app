import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { AnalyticsSummary, PlatformShare, CategoryTotal, AnalyticsFilters, ChartBar } from '../types';
import { getDatabase } from '../db/migrations';
import { startOfMonth } from 'date-fns';
import { useExchangeRatesStore } from './exchangeRatesSlice';
import {
  computeAnalytics,
  presetToDates,
  type AnalyticsRawTx,
  type AccountMeta,
} from '../utils/analyticsCompute';
import type { ChartGranularity } from '../utils/chartGranularity';
import { getHomeCurrency, getTransactionDateBounds } from '../db/repos/settings';
import type { IbkrHoldingEstimate } from '../utils/ibkrHoldings';
import { repairIbkrInvestments } from '../utils/repairIbkr';

export type { ChartBar };

interface AnalyticsState {
  summary: AnalyticsSummary[];
  platformShares: PlatformShare[];
  topCategories: CategoryTotal[];
  chartBars: ChartBar[];
  chartGranularity: ChartGranularity;
  filters: AnalyticsFilters;
  isLoading: boolean;
  homeCurrency: string;
  investmentTotal: number;
  investmentTxCount: number;
  ibkrHoldings: IbkrHoldingEstimate[];
  ibkrMarketValue: number;
  periodTxs: AnalyticsRawTx[];

  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  compute: (chartWidth?: number) => void;
  loadHomeCurrency: () => void;
}

function getEffectiveDateRange(
  filters: AnalyticsFilters,
): { dateFrom: number; dateTo: number } {
  if (filters.periodPreset !== 'all') {
    return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
  }
  const bounds = getTransactionDateBounds();
  if (bounds) {
    return { dateFrom: bounds.minD, dateTo: bounds.maxD };
  }
  const now = new Date();
  return { dateFrom: startOfMonth(now).getTime(), dateTo: now.getTime() };
}

const defaultFilters: AnalyticsFilters = {
  platforms: [],
  types: [],
  ...presetToDates('this_month'),
  periodPreset: 'this_month',
  excludeSelfTransfers: true,
};

export { presetToDates };

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  summary: [],
  platformShares: [],
  topCategories: [],
  chartBars: [],
  chartGranularity: 'monthly',
  filters: defaultFilters,
  isLoading: false,
  homeCurrency: 'UAH',
  investmentTotal: 0,
  investmentTxCount: 0,
  ibkrHoldings: [],
  ibkrMarketValue: 0,
  periodTxs: [],

  loadHomeCurrency: () => {
    set({ homeCurrency: getHomeCurrency('UAH') });
  },

  setFilters: (partial) => {
    const current = get().filters;
    const updated: AnalyticsFilters = { ...current, ...partial };
    if (partial.periodPreset && partial.periodPreset !== 'custom') {
      const dates = presetToDates(partial.periodPreset);
      updated.dateFrom = dates.dateFrom;
      updated.dateTo = dates.dateTo;
    }
    set({ filters: updated });
    get().compute();
  },

  compute: (chartWidth) => {
    void chartWidth;
    // Debounce rapid remount / focus / width changes
    const seq = ((get() as { _computeSeq?: number })._computeSeq ?? 0) + 1;
    (get() as { _computeSeq?: number })._computeSeq = seq;
    set({ isLoading: true });

    setTimeout(() => {
      if ((get() as { _computeSeq?: number })._computeSeq !== seq) return;
      repairIbkrInvestments();
      const { filters } = get();
      const db = getDatabase();
      const homeCurrency = get().homeCurrency;
      const rates = useExchangeRatesStore.getState().rates;
      const { dateFrom, dateTo } = getEffectiveDateRange(filters);

      const conditions: string[] = ['transaction_date >= ?', 'transaction_date <= ?'];
      const params: SQLiteBindValue[] = [dateFrom, dateTo];

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
        const accountRows = db.getAllSync<AccountMeta>(
          'SELECT id, name, display_name, color, platform FROM accounts',
        );

        const rawTxs = db.getAllSync<AnalyticsRawTx>(
          `SELECT id, account_id, platform, type, amount, currency, fee_amount, fee_currency,
                  category, tag, description, mcc, transaction_date
           FROM transactions ${where}`,
          params,
        );

        const excludeSelf = filters.excludeSelfTransfers !== false;
        const result = computeAnalytics(
          rawTxs, accountRows, homeCurrency, rates, dateFrom, dateTo, excludeSelf,
        );

        if ((get() as { _computeSeq?: number })._computeSeq !== seq) return;
        set({ ...result, isLoading: false });
      } catch (e) {
        console.error('[analyticsSlice] compute error:', e);
        set({ isLoading: false, investmentTotal: 0, investmentTxCount: 0, ibkrHoldings: [], ibkrMarketValue: 0, periodTxs: [] });
      }
    }, 0);
  },
}));
