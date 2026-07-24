import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { AnalyticsSummary, PlatformShare, CategoryTotal, AnalyticsFilters, Platform } from '../types';
import { getDatabase } from '../db/migrations';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addMonths, min as minDate } from 'date-fns';
import { useExchangeRatesStore } from './exchangeRatesSlice';
import { convertToHomeCurrency } from '../utils/currencyConvert';
import { resolveTransactionCategory } from '../utils/categories';
import {
  formatDayLabel,
  formatMonthLabel,
  formatQuarterLabel,
  formatMonthYearLabel,
  yearLabelForBar,
} from '../utils/chartLabels';
import {
  pickChartGranularity,
  yearsPerBarForGranularity,
  trimEmptyEdges,
  type ChartGranularity,
} from '../utils/chartGranularity';

export interface ChartBar {
  label: string;
  year: number;
  yearLabel?: string;
  periodLabel?: string;
  income: number;
  expense: number;
}

interface AnalyticsState {
  summary: AnalyticsSummary[];
  platformShares: PlatformShare[];
  topCategories: CategoryTotal[];
  chartBars: ChartBar[];
  chartGranularity: ChartGranularity;
  filters: AnalyticsFilters;
  isLoading: boolean;
  homeCurrency: string;

  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  compute: (chartWidth?: number) => void;
  loadHomeCurrency: () => void;
}

interface RawTx {
  account_id: string;
  platform: Platform;
  type: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string | null;
  category: string | null;
  tag: string | null;
  transaction_date: number;
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

function isAnalyticsTx(tx: RawTx, excludeSelfTransfers: boolean): boolean {
  if (excludeSelfTransfers && tx.tag === 'self_transfer') return false;
  if (tx.type === 'transfer') return false;
  return tx.type === 'income' || tx.type === 'expense';
}

function getEffectiveDateRange(
  db: ReturnType<typeof getDatabase>,
  filters: AnalyticsFilters,
): { dateFrom: number; dateTo: number } {
  if (filters.periodPreset !== 'all') {
    return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
  }
  const row = db.getFirstSync<{ minD: number | null; maxD: number | null }>(
    'SELECT MIN(transaction_date) as minD, MAX(transaction_date) as maxD FROM transactions WHERE transaction_date > 0',
  );
  if (row?.minD != null && row?.maxD != null) {
    return { dateFrom: row.minD, dateTo: row.maxD };
  }
  const now = new Date();
  return { dateFrom: startOfMonth(now).getTime(), dateTo: now.getTime() };
}

function aggregateTxs(
  txs: RawTx[],
  homeCurrency: string,
  rangeStart: Date,
  rangeEnd: Date,
  keyFn: (d: Date) => string,
  labelFn: (d: Date) => string,
  excludeSelfTransfers: boolean,
): Record<string, ChartBar> {
  const rates = useExchangeRatesStore.getState().rates;
  const map: Record<string, ChartBar> = {};

  for (const tx of txs) {
    if (!isAnalyticsTx(tx, excludeSelfTransfers)) continue;
    const txDate = new Date(tx.transaction_date);
    if (txDate < rangeStart || txDate > rangeEnd) continue;
    const key = keyFn(txDate);
    if (!map[key]) {
      map[key] = { label: labelFn(txDate), year: txDate.getFullYear(), income: 0, expense: 0 };
    }
    const converted = convertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);
    if (tx.type === 'income') map[key].income += converted;
    else if (tx.type === 'expense') map[key].expense += converted;
  }
  return map;
}

function buildDailyBarsFromTxs(
  txs: RawTx[],
  homeCurrency: string,
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd   = new Date(dateTo);
  const now        = new Date();
  const visualEnd  = minDate([rangeEnd, addDays(now < rangeEnd ? now : rangeEnd, 1)]);

  const map = aggregateTxs(txs, homeCurrency, rangeStart, visualEnd,
    (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
    (d) => formatDayLabel(d.getDate()),
    excludeSelfTransfers,
  );

  const sameMonth = rangeStart.getFullYear() === visualEnd.getFullYear()
    && rangeStart.getMonth() === visualEnd.getMonth();
  if (!sameMonth) {
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, bar]) => bar);
  }

  const year = rangeStart.getFullYear();
  const firstDay = rangeStart.getDate();
  const lastDay  = visualEnd.getDate();

  return Array.from({ length: lastDay - firstDay + 1 }, (_, i) => {
    const day = firstDay + i;
    const key = `${year}-${rangeStart.getMonth()}-${day}`;
    return map[key] ?? { label: formatDayLabel(day), year, income: 0, expense: 0 };
  });
}

function buildMonthlyBarsFromTxs(
  txs: RawTx[],
  homeCurrency: string,
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd   = new Date(dateTo);
  const now        = new Date();
  const visualEnd  = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 1)]);

  const map = aggregateTxs(txs, homeCurrency, rangeStart, visualEnd,
    (d) => `${d.getFullYear()}-${d.getMonth()}`,
    (d) => formatMonthLabel(d.getMonth()),
    excludeSelfTransfers,
  );

  const startIdx = rangeStart.getFullYear() * 12 + rangeStart.getMonth();
  const endIdx   = visualEnd.getFullYear() * 12 + visualEnd.getMonth();
  const bars: ChartBar[] = [];
  const spansYears = rangeStart.getFullYear() !== visualEnd.getFullYear();
  let prevYear: number | null = null;

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const year  = Math.floor(idx / 12);
    const month = idx % 12;
    const key   = `${year}-${month}`;
    const yearLabel = spansYears ? yearLabelForBar(year, prevYear) : undefined;
    if (yearLabel) prevYear = year;
    const existing = map[key];
    bars.push({
      ...(existing ?? { label: formatMonthLabel(month), income: 0, expense: 0 }),
      year,
      yearLabel,
      periodLabel: formatMonthYearLabel(month, year),
    });
  }
  return bars;
}

function buildQuarterlyBarsFromTxs(
  txs: RawTx[],
  homeCurrency: string,
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd   = new Date(dateTo);
  const now        = new Date();
  const visualEnd  = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 3)]);

  const map = aggregateTxs(txs, homeCurrency, rangeStart, visualEnd,
    (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`,
    (d) => formatQuarterLabel(Math.floor(d.getMonth() / 3) + 1),
    excludeSelfTransfers,
  );

  const startQ = rangeStart.getFullYear() * 4 + Math.floor(rangeStart.getMonth() / 3);
  const endQ   = visualEnd.getFullYear() * 4 + Math.floor(visualEnd.getMonth() / 3);
  const bars: ChartBar[] = [];

  for (let idx = startQ; idx <= endQ; idx++) {
    const year    = Math.floor(idx / 4);
    const quarter = (idx % 4) + 1;
    const key     = `${year}-Q${quarter}`;
    bars.push(map[key] ?? { label: formatQuarterLabel(quarter), year, income: 0, expense: 0 });
  }
  return bars;
}

function buildYearlyBarsFromTxs(
  txs: RawTx[],
  homeCurrency: string,
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd   = new Date(dateTo);
  const now        = new Date();
  const visualEnd  = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 12)]);

  const map = aggregateTxs(txs, homeCurrency, rangeStart, visualEnd,
    (d) => String(d.getFullYear()),
    (d) => String(d.getFullYear()),
    excludeSelfTransfers,
  );

  const bars: ChartBar[] = [];
  for (let year = rangeStart.getFullYear(); year <= visualEnd.getFullYear(); year++) {
    const key = String(year);
    bars.push(map[key] ?? { label: String(year), year, income: 0, expense: 0 });
  }
  return bars;
}

function buildMultiYearBarsFromTxs(
  txs: RawTx[],
  homeCurrency: string,
  dateFrom: number,
  dateTo: number,
  yearsPerBar: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd   = new Date(dateTo);
  const now        = new Date();
  const visualEnd  = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 12)]);

  const map = aggregateTxs(txs, homeCurrency, rangeStart, visualEnd,
    (d) => {
      const bucket = Math.floor(d.getFullYear() / yearsPerBar) * yearsPerBar;
      return `b${bucket}`;
    },
    (d) => {
      const bucket = Math.floor(d.getFullYear() / yearsPerBar) * yearsPerBar;
      const endY = Math.min(bucket + yearsPerBar - 1, visualEnd.getFullYear());
      return bucket === endY ? String(bucket) : `${bucket}–${endY}`;
    },
    excludeSelfTransfers,
  );

  const startBucket = Math.floor(rangeStart.getFullYear() / yearsPerBar) * yearsPerBar;
  const endBucket   = Math.floor(visualEnd.getFullYear() / yearsPerBar) * yearsPerBar;
  const bars: ChartBar[] = [];

  for (let bucket = startBucket; bucket <= endBucket; bucket += yearsPerBar) {
    const endY = Math.min(bucket + yearsPerBar - 1, visualEnd.getFullYear());
    const label = bucket === endY ? String(bucket) : `${bucket}–${endY}`;
    const key = `b${bucket}`;
    bars.push(map[key] ?? { label, year: bucket, income: 0, expense: 0 });
  }
  return bars;
}

function getDataBoundedRange(
  txs: RawTx[],
  homeCurrency: string,
  excludeSelfTransfers: boolean,
): { dateFrom: number; dateTo: number } | null {
  const rates = useExchangeRatesStore.getState().rates;
  let minD: number | null = null;
  let maxD: number | null = null;

  for (const tx of txs) {
    if (!isAnalyticsTx(tx, excludeSelfTransfers)) continue;
    const converted = convertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);
    if (converted <= 0) continue;
    if (minD === null || tx.transaction_date < minD) minD = tx.transaction_date;
    if (maxD === null || tx.transaction_date > maxD) maxD = tx.transaction_date;
  }
  if (minD === null || maxD === null) return null;
  return { dateFrom: minD, dateTo: maxD };
}

function buildChartBars(
  txs: RawTx[],
  homeCurrency: string,
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): { bars: ChartBar[]; granularity: ChartGranularity } {
  const dataBounds = getDataBoundedRange(txs, homeCurrency, excludeSelfTransfers);
  const effectiveFrom = dataBounds ? Math.max(dateFrom, dataBounds.dateFrom) : dateFrom;
  const effectiveTo   = dataBounds ? Math.min(dateTo, dataBounds.dateTo) : dateTo;

  if (effectiveFrom > effectiveTo) {
    return { bars: [], granularity: 'monthly' };
  }

  const granularity = pickChartGranularity(effectiveFrom, effectiveTo);
  const yearsPerBar = yearsPerBarForGranularity(granularity);

  let bars: ChartBar[] = [];
  switch (granularity) {
    case 'daily':
      bars = buildDailyBarsFromTxs(txs, homeCurrency, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'monthly':
      bars = buildMonthlyBarsFromTxs(txs, homeCurrency, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'quarterly':
      bars = buildQuarterlyBarsFromTxs(txs, homeCurrency, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'yearly':
      bars = buildYearlyBarsFromTxs(txs, homeCurrency, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'multi_year_5':
    case 'multi_year_10':
      bars = buildMultiYearBarsFromTxs(txs, homeCurrency, effectiveFrom, effectiveTo, yearsPerBar, excludeSelfTransfers);
      break;
  }
  return { bars: trimEmptyEdges(bars), granularity };
}

const defaultFilters: AnalyticsFilters = {
  platforms: [],
  types: [],
  ...presetToDates('this_month'),
  periodPreset: 'this_month',
  excludeSelfTransfers: true,
};

let lastChartWidth = 360; // reserved for future responsive tweaks

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  summary: [],
  platformShares: [],
  topCategories: [],
  chartBars: [],
  chartGranularity: 'monthly',
  filters: defaultFilters,
  isLoading: false,
  homeCurrency: 'UAH',

  loadHomeCurrency: () => {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<{ home_currency: string | null }>(
        'SELECT home_currency FROM settings WHERE id = 1',
      );
      if (row?.home_currency) set({ homeCurrency: row.home_currency });
    } catch {}
  },

  setFilters: (partial) => {
    const current = get().filters;
    const updated: AnalyticsFilters = { ...current, ...partial };
    if (partial.periodPreset && partial.periodPreset !== 'custom') {
      const dates = presetToDates(partial.periodPreset);
      updated.dateFrom = dates.dateFrom;
      updated.dateTo   = dates.dateTo;
    }
    set({ filters: updated });
    get().compute();
  },

  compute: (chartWidth) => {
    if (chartWidth) lastChartWidth = chartWidth;
    set({ isLoading: true });
    const { filters } = get();
    const db = getDatabase();
    const homeCurrency = get().homeCurrency;
    const rates = useExchangeRatesStore.getState().rates;
    const { dateFrom, dateTo } = getEffectiveDateRange(db, filters);

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
      const accountRows = db.getAllSync<{
        id: string; name: string; display_name: string | null;
        color: string | null; platform: Platform;
      }>('SELECT id, name, display_name, color, platform FROM accounts');
      const accountMap = new Map(accountRows.map((a) => [a.id, a]));

      const rawTxs = db.getAllSync<RawTx>(
        `SELECT account_id, platform, type, amount, currency, fee_amount, fee_currency,
                category, tag, transaction_date
         FROM transactions ${where}`,
        params,
      );

      const summaryMap = new Map<string, AnalyticsSummary>();
      const accountShareMap = new Map<string, { income: number; expense: number }>();
      const categoryMap = new Map<string, { total: number; txCount: number }>();

      const excludeSelf = filters.excludeSelfTransfers !== false;

      for (const tx of rawTxs) {
        const feeCur = tx.fee_currency ?? tx.currency;
        const feeConverted = convertToHomeCurrency(tx.fee_amount ?? 0, feeCur, homeCurrency, rates);

        if (isAnalyticsTx(tx, excludeSelf)) {
          const converted = convertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);
          const period = new Date(tx.transaction_date).toISOString().slice(0, 7);
          const sumKey = `${tx.platform}|${period}`;
          const existing = summaryMap.get(sumKey) ?? {
            platform: tx.platform, period, currency: homeCurrency,
            totalIncome: 0, totalExpense: 0, totalFees: 0, netResult: 0, txCount: 0,
          };
          if (tx.type === 'income') existing.totalIncome += converted;
          else if (tx.type === 'expense') existing.totalExpense += converted;
          existing.totalFees += feeConverted;
          existing.txCount += 1;
          existing.netResult = existing.totalIncome - existing.totalExpense - existing.totalFees;
          summaryMap.set(sumKey, existing);

          const share = accountShareMap.get(tx.account_id) ?? { income: 0, expense: 0 };
          if (tx.type === 'income') share.income += converted;
          else if (tx.type === 'expense') share.expense += converted;
          accountShareMap.set(tx.account_id, share);

          if (tx.type === 'expense') {
            const cat = resolveTransactionCategory(tx);
            const catEntry = categoryMap.get(cat) ?? { total: 0, txCount: 0 };
            catEntry.total += converted;
            catEntry.txCount += 1;
            categoryMap.set(cat, catEntry);
          }
        } else if (tx.type === 'fee' || tx.fee_amount > 0) {
          const period = new Date(tx.transaction_date).toISOString().slice(0, 7);
          const sumKey = `${tx.platform}|${period}`;
          const existing = summaryMap.get(sumKey) ?? {
            platform: tx.platform, period, currency: homeCurrency,
            totalIncome: 0, totalExpense: 0, totalFees: 0, netResult: 0, txCount: 0,
          };
          existing.totalFees += feeConverted;
          existing.netResult = existing.totalIncome - existing.totalExpense - existing.totalFees;
          summaryMap.set(sumKey, existing);
        }
      }

      const summary = [...summaryMap.values()].sort((a, b) => b.period.localeCompare(a.period));
      const totalIncomeAll  = [...accountShareMap.values()].reduce((s, v) => s + v.income, 0);
      const totalExpenseAll = [...accountShareMap.values()].reduce((s, v) => s + v.expense, 0);

      const platformShares: PlatformShare[] = [];
      for (const [accountId, totals] of accountShareMap) {
        const acc = accountMap.get(accountId);
        if (totals.income > 0) {
          platformShares.push({
            accountId,
            accountName: acc ? (acc.display_name ?? acc.name) : accountId,
            platform: acc?.platform ?? 'manual',
            type: 'income',
            platformTotal: totals.income,
            sharePct: totalIncomeAll > 0 ? Math.round(totals.income / totalIncomeAll * 10000) / 100 : 0,
            color: acc?.color ?? undefined,
          });
        }
        if (totals.expense > 0) {
          platformShares.push({
            accountId,
            accountName: acc ? (acc.display_name ?? acc.name) : accountId,
            platform: acc?.platform ?? 'manual',
            type: 'expense',
            platformTotal: totals.expense,
            sharePct: totalExpenseAll > 0 ? Math.round(totals.expense / totalExpenseAll * 10000) / 100 : 0,
            color: acc?.color ?? undefined,
          });
        }
      }

      const topCategories: CategoryTotal[] = [...categoryMap.entries()]
        .map(([category, data]) => ({ category, total: data.total, txCount: data.txCount }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const { bars, granularity } = buildChartBars(
        rawTxs, homeCurrency, dateFrom, dateTo, excludeSelf,
      );

      set({ summary, platformShares, topCategories, chartBars: bars, chartGranularity: granularity, isLoading: false });
    } catch (e) {
      console.error('[analyticsSlice] compute error:', e);
      set({ isLoading: false });
    }
  },
}));
