import { startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addMonths, min as minDate } from 'date-fns';
import type {
  AnalyticsSummary,
  PlatformShare,
  CategoryTotal,
  AnalyticsFilters,
  Platform,
  ChartBar,
  CurrencyRate,
} from '../types';
import { convertToHomeCurrency } from './currencyConvert';
import { isInvestmentPurchase, isInvestmentExit, storedCategoryKey } from './categories';
import { getCategoryImpact } from './categoryImpact';
import {
  formatDayLabel,
  formatMonthLabel,
  formatQuarterLabel,
  formatMonthYearLabel,
  yearLabelForBar,
} from './chartLabels';
import {
  pickChartGranularity,
  yearsPerBarForGranularity,
  trimEmptyEdges,
  type ChartGranularity,
} from './chartGranularity';
import { estimateIbkrPortfolio, type IbkrHoldingEstimate } from './ibkrHoldings';

export interface AnalyticsRawTx {
  id: string;
  account_id: string;
  platform: Platform;
  type: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string | null;
  category: string | null;
  tag: string | null;
  description: string | null;
  mcc: number | null;
  transaction_date: number;
}

export interface AccountMeta {
  id: string;
  name: string;
  display_name: string | null;
  color: string | null;
  platform: Platform;
}

export interface AnalyticsComputeResult {
  summary: AnalyticsSummary[];
  platformShares: PlatformShare[];
  topCategories: CategoryTotal[];
  chartBars: ChartBar[];
  chartGranularity: ChartGranularity;
  investmentTotal: number;
  investmentTxCount: number;
  ibkrHoldings: IbkrHoldingEstimate[];
  ibkrMarketValue: number;
  /** Period transactions for category drill-down. */
  periodTxs: AnalyticsRawTx[];
}

function isSelfTransferTx(tx: AnalyticsRawTx): boolean {
  if (tx.tag === 'self_transfer') return true;
  if (tx.tag && tx.tag !== 'transfer' && tx.tag !== 'other') return false;
  return tx.category === 'self_transfer';
}

/** Direction for self-transfer rows (usually type=transfer with absolute amount). */
function selfTransferSide(tx: AnalyticsRawTx): 'income' | 'expense' {
  if (tx.type === 'income') return 'income';
  if (tx.type === 'expense') return 'expense';
  const d = tx.description ?? '';
  if (
    /CASH RECEIPTS|ELECTRONIC FUND TRANSFER|deposit|From:|надход|отрима|received|top-?up|поповнен/i.test(d)
    && !/Withdrawal|Transfer to|на картку|High Risk/i.test(d)
  ) {
    return 'income';
  }
  return 'expense';
}

function shouldIncludeInCategoryBreakdown(
  tx: AnalyticsRawTx,
  effectiveCat: ReturnType<typeof storedCategoryKey>,
): boolean {
  // BUY / investment spend belongs in expense categories
  if (isInvestmentPurchase(tx) || effectiveCat === 'investment') return true;
  // SELL / realized is income-like — not in expense breakdown
  if (isInvestmentExit(tx) || effectiveCat === 'realized') return false;
  if (effectiveCat === 'forex') return false;
  if (effectiveCat === 'self_transfer' || effectiveCat === 'transfer' || effectiveCat === 'cancellation') return false;
  if (effectiveCat === 'income' || effectiveCat === 'top_up' || effectiveCat === 'dividend') {
    return false;
  }
  if (effectiveCat === 'fee') return true;
  const impact = getCategoryImpact(effectiveCat);
  if (impact === 'expense' || impact === 'fee') return true;
  if (impact === 'income' || impact === 'neutral') return false;
  return tx.type === 'expense' || tx.type === 'fee';
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

/** Extra fee_amount on trades (not standalone fee rows) → always expense. */
function feeAmountAsExpense(tx: AnalyticsRawTx): number {
  if (tx.type === 'fee' || storedCategoryKey(tx) === 'fee') return 0;
  return Math.abs(tx.fee_amount ?? 0);
}

/**
 * Cashflow side for analytics.
 * BUY / investment → expense; SELL / realized → income.
 * Fees (type/tag) and custom tag impact drive expense/income.
 */
function cashflowSide(tx: AnalyticsRawTx): 'income' | 'expense' | null {
  if (isInvestmentPurchase(tx)) return 'expense';
  if (isInvestmentExit(tx)) return 'income';

  const cat = storedCategoryKey(tx);
  if (
    cat === 'forex'
    || cat === 'self_transfer' || cat === 'transfer' || cat === 'cancellation'
  ) {
    return null;
  }

  if (tx.type === 'fee' || cat === 'fee') return 'expense';

  const impact = getCategoryImpact(cat);
  if (impact === 'income') return 'income';
  if (impact === 'expense' || impact === 'fee') return 'expense';
  // neutral: follow type only for income/expense
  if (tx.type === 'income') return 'income';
  if (tx.type === 'expense' || tx.type === 'fee') return 'expense';
  return null;
}

/** Cash P&L includes investment buys/sells; self-transfers optional via toggle. */
function isAnalyticsTx(tx: AnalyticsRawTx, excludeSelfTransfers: boolean): boolean {
  if (storedCategoryKey(tx) === 'cancellation') return false;
  if (storedCategoryKey(tx) === 'forex') return false;
  if (isInvestmentPurchase(tx) || isInvestmentExit(tx)) return true;
  if (isSelfTransferTx(tx)) return !excludeSelfTransfers;
  return cashflowSide(tx) != null;
}

function applyPnL(
  bar: { income: number; expense: number },
  tx: AnalyticsRawTx,
  converted: number,
  excludeSelfTransfers: boolean,
  feeConverted = 0,
): void {
  if (isSelfTransferTx(tx)) {
    if (excludeSelfTransfers) return;
    if (selfTransferSide(tx) === 'income') bar.income += converted;
    else bar.expense += converted;
    if (feeConverted > 0) bar.expense += feeConverted;
    return;
  }
  const side = cashflowSide(tx);
  if (side === 'income') bar.income += converted;
  else if (side === 'expense') bar.expense += converted;
  if (feeConverted > 0) bar.expense += feeConverted;
}

function aggregateTxs(
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  rangeStart: Date,
  rangeEnd: Date,
  keyFn: (d: Date) => string,
  labelFn: (d: Date) => string,
  excludeSelfTransfers: boolean,
): Record<string, ChartBar> {
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
    const feeAmt = feeAmountAsExpense(tx);
    const feeConverted = feeAmt > 0
      ? convertToHomeCurrency(feeAmt, tx.fee_currency ?? tx.currency, homeCurrency, rates)
      : 0;
    applyPnL(map[key], tx, converted, excludeSelfTransfers, feeConverted);
  }
  return map;
}

function buildDailyBarsFromTxs(
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd = new Date(dateTo);
  const now = new Date();
  const visualEnd = minDate([rangeEnd, addDays(now < rangeEnd ? now : rangeEnd, 1)]);

  const map = aggregateTxs(
    txs, homeCurrency, rates, rangeStart, visualEnd,
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
  const lastDay = visualEnd.getDate();

  return Array.from({ length: lastDay - firstDay + 1 }, (_, i) => {
    const day = firstDay + i;
    const key = `${year}-${rangeStart.getMonth()}-${day}`;
    return map[key] ?? { label: formatDayLabel(day), year, income: 0, expense: 0 };
  });
}

function buildMonthlyBarsFromTxs(
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd = new Date(dateTo);
  const now = new Date();
  const visualEnd = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 1)]);

  const map = aggregateTxs(
    txs, homeCurrency, rates, rangeStart, visualEnd,
    (d) => `${d.getFullYear()}-${d.getMonth()}`,
    (d) => formatMonthLabel(d.getMonth()),
    excludeSelfTransfers,
  );

  const startIdx = rangeStart.getFullYear() * 12 + rangeStart.getMonth();
  const endIdx = visualEnd.getFullYear() * 12 + visualEnd.getMonth();
  const bars: ChartBar[] = [];
  const spansYears = rangeStart.getFullYear() !== visualEnd.getFullYear();
  let prevYear: number | null = null;

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const year = Math.floor(idx / 12);
    const month = idx % 12;
    const key = `${year}-${month}`;
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
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd = new Date(dateTo);
  const now = new Date();
  const visualEnd = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 3)]);

  const map = aggregateTxs(
    txs, homeCurrency, rates, rangeStart, visualEnd,
    (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`,
    (d) => formatQuarterLabel(Math.floor(d.getMonth() / 3) + 1),
    excludeSelfTransfers,
  );

  const startQ = rangeStart.getFullYear() * 4 + Math.floor(rangeStart.getMonth() / 3);
  const endQ = visualEnd.getFullYear() * 4 + Math.floor(visualEnd.getMonth() / 3);
  const bars: ChartBar[] = [];

  for (let idx = startQ; idx <= endQ; idx++) {
    const year = Math.floor(idx / 4);
    const quarter = (idx % 4) + 1;
    const key = `${year}-Q${quarter}`;
    bars.push(map[key] ?? { label: formatQuarterLabel(quarter), year, income: 0, expense: 0 });
  }
  return bars;
}

function buildYearlyBarsFromTxs(
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd = new Date(dateTo);
  const now = new Date();
  const visualEnd = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 12)]);

  const map = aggregateTxs(
    txs, homeCurrency, rates, rangeStart, visualEnd,
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
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  yearsPerBar: number,
  excludeSelfTransfers: boolean,
): ChartBar[] {
  const rangeStart = new Date(dateFrom);
  const rangeEnd = new Date(dateTo);
  const now = new Date();
  const visualEnd = minDate([rangeEnd, addMonths(now < rangeEnd ? now : rangeEnd, 12)]);

  const map = aggregateTxs(
    txs, homeCurrency, rates, rangeStart, visualEnd,
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
  const endBucket = Math.floor(visualEnd.getFullYear() / yearsPerBar) * yearsPerBar;
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
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  excludeSelfTransfers: boolean,
): { dateFrom: number; dateTo: number } | null {
  let minD: number | null = null;
  let maxD: number | null = null;

  for (const tx of txs) {
    if (!isInvestmentPurchase(tx) && !isAnalyticsTx(tx, excludeSelfTransfers)) continue;
    const converted = convertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);
    if (converted <= 0) continue;
    if (minD === null || tx.transaction_date < minD) minD = tx.transaction_date;
    if (maxD === null || tx.transaction_date > maxD) maxD = tx.transaction_date;
  }
  if (minD === null || maxD === null) return null;
  return { dateFrom: minD, dateTo: maxD };
}

export function buildChartBars(
  txs: AnalyticsRawTx[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): { bars: ChartBar[]; granularity: ChartGranularity } {
  const dataBounds = getDataBoundedRange(txs, homeCurrency, rates, excludeSelfTransfers);
  const effectiveFrom = dataBounds ? Math.max(dateFrom, dataBounds.dateFrom) : dateFrom;
  const effectiveTo = dataBounds ? Math.min(dateTo, dataBounds.dateTo) : dateTo;

  if (effectiveFrom > effectiveTo) {
    return { bars: [], granularity: 'monthly' };
  }

  const granularity = pickChartGranularity(effectiveFrom, effectiveTo);
  const yearsPerBar = yearsPerBarForGranularity(granularity);

  let bars: ChartBar[] = [];
  switch (granularity) {
    case 'daily':
      bars = buildDailyBarsFromTxs(txs, homeCurrency, rates, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'monthly':
      bars = buildMonthlyBarsFromTxs(txs, homeCurrency, rates, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'quarterly':
      bars = buildQuarterlyBarsFromTxs(txs, homeCurrency, rates, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'yearly':
      bars = buildYearlyBarsFromTxs(txs, homeCurrency, rates, effectiveFrom, effectiveTo, excludeSelfTransfers);
      break;
    case 'multi_year_5':
    case 'multi_year_10':
      bars = buildMultiYearBarsFromTxs(
        txs, homeCurrency, rates, effectiveFrom, effectiveTo, yearsPerBar, excludeSelfTransfers,
      );
      break;
  }
  return { bars: trimEmptyEdges(bars), granularity };
}

/** Pure analytics aggregation — store only loads data and holds results. */
export function computeAnalytics(
  rawTxs: AnalyticsRawTx[],
  accountRows: AccountMeta[],
  homeCurrency: string,
  rates: CurrencyRate[],
  dateFrom: number,
  dateTo: number,
  excludeSelfTransfers: boolean,
): AnalyticsComputeResult {
  const accountMap = new Map(accountRows.map((a) => [a.id, a]));
  const summaryMap = new Map<string, AnalyticsSummary>();
  const accountShareMap = new Map<string, { income: number; expense: number }>();
  const categoryMap = new Map<string, { total: number; txCount: number }>();
  let investmentTotal = 0;
  let investmentTxCount = 0;

  for (const tx of rawTxs) {
    const feeCur = tx.fee_currency ?? tx.currency;
    const feeConverted = convertToHomeCurrency(tx.fee_amount ?? 0, feeCur, homeCurrency, rates);
    const effectiveCat = storedCategoryKey(tx);
    const converted = convertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);

    if (isInvestmentPurchase(tx)) {
      investmentTxCount += 1;
      // Also counted as cash expense below via cashflowSide — dual accounting
    }

    if (isAnalyticsTx(tx, excludeSelfTransfers)) {
      const period = new Date(tx.transaction_date).toISOString().slice(0, 7);
      const sumKey = `${tx.platform}|${period}`;
      const existing = summaryMap.get(sumKey) ?? {
        platform: tx.platform, period, currency: homeCurrency,
        totalIncome: 0, totalExpense: 0, totalFees: 0, netResult: 0, txCount: 0,
      };
      if (isSelfTransferTx(tx)) {
        if (selfTransferSide(tx) === 'income') existing.totalIncome += converted;
        else existing.totalExpense += converted;
      } else {
        const side = cashflowSide(tx);
        if (side === 'income') existing.totalIncome += converted;
        else if (side === 'expense') existing.totalExpense += converted;
      }
      // Fees count as expenses (also tracked separately for fees KPI)
      const feeExtra = feeAmountAsExpense(tx);
      const feeExtraConverted = feeExtra > 0
        ? convertToHomeCurrency(feeExtra, feeCur, homeCurrency, rates)
        : 0;
      const feesForKpi = feeConverted > 0 ? feeConverted : (
        (tx.type === 'fee' || effectiveCat === 'fee') ? converted : 0
      );
      existing.totalFees += feesForKpi;
      if (feeExtraConverted > 0) existing.totalExpense += feeExtraConverted;
      existing.txCount += 1;
      existing.netResult = existing.totalIncome - existing.totalExpense;
      summaryMap.set(sumKey, existing);

      const share = accountShareMap.get(tx.account_id) ?? { income: 0, expense: 0 };
      if (isSelfTransferTx(tx)) {
        if (selfTransferSide(tx) === 'income') share.income += converted;
        else share.expense += converted;
      } else {
        const side = cashflowSide(tx);
        if (side === 'income') share.income += converted;
        else if (side === 'expense') share.expense += converted;
      }
      if (feeExtraConverted > 0) share.expense += feeExtraConverted;
      accountShareMap.set(tx.account_id, share);
    } else if (
      storedCategoryKey(tx) !== 'cancellation'
      && (tx.type === 'fee' || tx.fee_amount > 0)
    ) {
      const period = new Date(tx.transaction_date).toISOString().slice(0, 7);
      const sumKey = `${tx.platform}|${period}`;
      const existing = summaryMap.get(sumKey) ?? {
        platform: tx.platform, period, currency: homeCurrency,
        totalIncome: 0, totalExpense: 0, totalFees: 0, netResult: 0, txCount: 0,
      };
      existing.totalFees += feeConverted;
      existing.totalExpense += feeConverted;
      existing.netResult = existing.totalIncome - existing.totalExpense;
      summaryMap.set(sumKey, existing);

      const share = accountShareMap.get(tx.account_id) ?? { income: 0, expense: 0 };
      share.expense += feeConverted;
      accountShareMap.set(tx.account_id, share);
    }

    if (shouldIncludeInCategoryBreakdown(tx, effectiveCat)) {
      const catEntry = categoryMap.get(effectiveCat) ?? { total: 0, txCount: 0 };
      catEntry.total += converted;
      catEntry.txCount += 1;
      categoryMap.set(effectiveCat, catEntry);
    }
  }

  const portfolio = estimateIbkrPortfolio(rawTxs, homeCurrency, rates);
  // Net invested = buys − sells (sales reduce capital still deployed)
  investmentTotal = portfolio.investedTotal;

  const summary = [...summaryMap.values()].sort((a, b) => b.period.localeCompare(a.period));
  const totalIncomeAll = [...accountShareMap.values()].reduce((s, v) => s + v.income, 0);
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
    .sort((a, b) => b.total - a.total);

  const { bars, granularity } = buildChartBars(
    rawTxs, homeCurrency, rates, dateFrom, dateTo, excludeSelfTransfers,
  );

  return {
    summary,
    platformShares,
    topCategories,
    chartBars: bars,
    chartGranularity: granularity,
    investmentTotal,
    investmentTxCount,
    ibkrHoldings: portfolio.holdings,
    ibkrMarketValue: portfolio.marketValueTotal,
    periodTxs: rawTxs,
  };
}
