const MONTH_SHORT_UK = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];

export function formatDayLabel(day: number): string {
  return String(day);
}

export function formatMonthLabel(monthIndex: number, locale: 'uk' | 'en' = 'uk'): string {
  if (locale === 'uk') return MONTH_SHORT_UK[monthIndex];
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return en[monthIndex];
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

export function countMonthsInRange(dateFrom: number, dateTo: number): number {
  const start = new Date(dateFrom);
  const end   = new Date(dateTo);
  return (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1;
}
