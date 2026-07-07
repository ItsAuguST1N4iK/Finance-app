import type { ChartBar } from '../store/analyticsSlice';

export type ChartGranularity = 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'multi_year';

const MIN_GROUP_W = 28;

export function maxBarsForWidth(chartWidth: number): number {
  return Math.max(4, Math.floor(chartWidth / MIN_GROUP_W));
}

export function pickChartGranularity(
  periodPreset: string | undefined,
  dateFrom: number,
  dateTo: number,
  chartWidth: number,
): ChartGranularity {
  if (periodPreset === 'this_month' || periodPreset === 'last_month') return 'daily';

  const start = new Date(dateFrom);
  const end   = new Date(dateTo);
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1;
  const quarterSpan = Math.ceil(monthSpan / 3);
  const yearSpan = end.getFullYear() - start.getFullYear() + 1;
  const maxBars = maxBarsForWidth(chartWidth);

  if (monthSpan <= 18 && monthSpan <= maxBars) return 'monthly';
  if (quarterSpan <= maxBars) return 'quarterly';
  if (yearSpan <= maxBars) return 'yearly';
  return 'multi_year';
}

export function yearsPerMultiYearBar(yearSpan: number, chartWidth: number): number {
  const maxBars = maxBarsForWidth(chartWidth);
  if (yearSpan <= maxBars) return 1;
  const perBar = Math.ceil(yearSpan / maxBars);
  if (perBar <= 5) return perBar;
  return Math.ceil(perBar / 5) * 5;
}

export interface YearBand {
  year: number;
  startIdx: number;
  endIdx: number;
}

export function computeYearBands(bars: ChartBar[]): YearBand[] {
  if (bars.length === 0) return [];
  const bands: YearBand[] = [];
  let year = bars[0].year;
  let startIdx = 0;

  for (let i = 1; i <= bars.length; i++) {
    if (i === bars.length || bars[i].year !== year) {
      bands.push({ year, startIdx, endIdx: i - 1 });
      if (i < bars.length) {
        year = bars[i].year;
        startIdx = i;
      }
    }
  }
  return bands;
}
