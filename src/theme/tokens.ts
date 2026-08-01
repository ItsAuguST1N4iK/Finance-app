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
  /** Cards, sections, sheets, dialogs — one radius family */
  lg: 16,
  sheet: 16,
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

/** Keep in sync with IslandTabBar.TAB_ISLAND_HEIGHT + TAB_BAR_GAP */
const TAB_ISLAND_HEIGHT_TOKEN = 58 + 8;

export const layout = {
  screenPad: space[4],
  sectionGap: space[4],
  /** Island height + gap above home indicator (add insets.bottom at call sites when needed) */
  tabBarClearance: TAB_ISLAND_HEIGHT_TOKEN,
  /** Scroll content padding so last items clear the floating tab island */
  listBottom: TAB_ISLAND_HEIGHT_TOKEN + 42,
  sheetPad: space[5],
  chipGap: space[2],
  /** Right inset so scroll indicators don't cover text */
  scrollGutter: 14,
} as const;

/** Contour stroke — one width for cards, chips, sheets, tab bar. */
export const stroke = {
  width: 1.25,
  hairline: 1,
} as const;

