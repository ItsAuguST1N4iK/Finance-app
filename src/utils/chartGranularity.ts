import type { ChartBar } from '../types';

export type ChartGranularity =
  | 'daily'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'multi_year_5'
  | 'multi_year_10';

/** Max double-bar groups visible on screen at once */
export const MAX_CHART_BARS = 32;

export function pickChartGranularity(
  dateFrom: number,
  dateTo: number,
): ChartGranularity {
  const start = new Date(dateFrom);
  const end   = new Date(dateTo);

  const daySpan = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1;
  const quarterSpan = Math.ceil(monthSpan / 3);
  const yearSpan = end.getFullYear() - start.getFullYear() + 1;

  if (daySpan <= MAX_CHART_BARS) return 'daily';
  if (monthSpan <= MAX_CHART_BARS) return 'monthly';
  if (quarterSpan <= MAX_CHART_BARS) return 'quarterly';
  if (yearSpan <= MAX_CHART_BARS) return 'yearly';
  if (Math.ceil(yearSpan / 5) <= MAX_CHART_BARS) return 'multi_year_5';
  return 'multi_year_10';
}

export function yearsPerBarForGranularity(g: ChartGranularity): number {
  if (g === 'multi_year_5') return 5;
  if (g === 'multi_year_10') return 10;
  return 1;
}

export function trimEmptyEdges(bars: ChartBar[]): ChartBar[] {
  if (bars.length === 0) return bars;
  let first = 0;
  let last  = bars.length - 1;
  while (first <= last && bars[first].income === 0 && bars[first].expense === 0) first++;
  while (last >= first && bars[last].income === 0 && bars[last].expense === 0) last--;
  return first <= last ? bars.slice(first, last + 1) : [];
}

export function isYearGranularity(g: ChartGranularity): boolean {
  return g === 'yearly' || g === 'multi_year_5' || g === 'multi_year_10';
}

export interface YearBand {
  year: number;
  startIdx: number;
  endIdx: number;
  label?: string;
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

export function computePerBarBands(bars: ChartBar[]): YearBand[] {
  return bars.map((bar, i) => ({
    year: bar.year,
    startIdx: i,
    endIdx: i,
    label: bar.periodLabel ?? bar.label,
  }));
}
