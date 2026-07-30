/** Shared layout / typography tokens — use instead of magic numbers. */

export const space = {
  0: 0,
  1: 4,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  sheet: 24,
  pill: 20,
  fab: 28,
} as const;

export const type = {
  hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  title: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const },
  meta: { fontSize: 12, fontWeight: '500' as const },
  caption: { fontSize: 11, fontWeight: '600' as const },
  section: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  amount: { fontSize: 15, fontWeight: '700' as const },
  kpi: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.5 },
} as const;

export const layout = {
  screenPad: space[4],
  sectionGap: space[4],
  listBottom: 100,
  sheetPad: space[5],
  chipGap: space[2],
} as const;
