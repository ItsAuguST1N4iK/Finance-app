/**
 * Single popup size language for the whole app.
 *
 * Max height = 75% of the phone screen, measured from the physical bottom upward.
 * Sheets park above the floating tab island (marginBottom = tab clearance).
 */
import { radius, space } from './tokens';
import { TAB_BAR_GAP, TAB_ISLAND_HEIGHT } from '../navigation/IslandTabBar';

/** Hard cap: 75% of screen height from the bottom. */
export const SHEET_MAX_SCREEN_RATIO = 0.75;

export const SHEET_RADIUS = radius.lg;
export const SHEET_INSET = space[3];

/** Space reserved under the sheet so it sits above the island tab bar. */
export function sheetTabClearance(bottomInset: number): number {
  return Math.max(bottomInset, 8) + TAB_ISLAND_HEIGHT + TAB_BAR_GAP + TAB_BAR_GAP;
}

/**
 * Max sheet panel height in px.
 * = 75% of window height, also clipped so it never runs under the status bar
 * when stacked above the tab clearance.
 */
export function sheetMaxPx(
  windowHeight: number,
  opts: { topInset?: number; bottomInset?: number } = {},
): number {
  const top = opts.topInset ?? 0;
  const bottom = sheetTabClearance(opts.bottomInset ?? 0);
  const byRatio = Math.round(windowHeight * SHEET_MAX_SCREEN_RATIO);
  const byChrome = Math.max(160, windowHeight - top - bottom);
  return Math.min(byRatio, byChrome);
}
