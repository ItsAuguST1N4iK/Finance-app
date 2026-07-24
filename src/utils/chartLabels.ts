const MONTH_SHORT_UK = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];

export function formatDayLabel(day: number): string {
  return String(day);
}

export function formatMonthLabel(monthIndex: number, locale: 'uk' | 'en' = 'uk'): string {
  const label = locale === 'uk' ? MONTH_SHORT_UK[monthIndex] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
  return `${label}\u2009`;
}

export function formatQuarterLabel(quarter: number): string {
  return `Q${quarter}`;
}

export function yearLabelForBar(
  year: number,
  prevYear: number | null,
): string | undefined {
  return prevYear === null || prevYear !== year ? String(year) : undefined;
}

export function formatMonthYearLabel(monthIndex: number, year: number, locale: 'uk' | 'en' = 'uk'): string {
  const MONTH_FULL_UK = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  const MONTH_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const name = locale === 'uk' ? MONTH_FULL_UK[monthIndex] : MONTH_FULL_EN[monthIndex];
  return `${name} ${year}`;
}

export function countMonthsInRange(dateFrom: number, dateTo: number): number {
  const start = new Date(dateFrom);
  const end   = new Date(dateTo);
  return (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1;
}
