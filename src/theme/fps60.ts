/**
 * Fixed timing budgets for 60fps overlay / collapsible motion.
 * Prefer opacity + translateY on the UI thread — avoid animating layout `height` on heavy trees.
 */
import { Easing } from 'react-native-reanimated';

export const fps60 = {
  /** Nested content fade (before shell collapse on close) */
  contentOut: 120,
  contentIn: 140,
  /** Shell slide (visible collapse / expand) — keep readable */
  shell: 280,
  backdrop: 260,
  mountDelay: 16,
  /** List/section collapse shell */
  collapseShell: 240,
} as const;

export const fpsEasing = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.4, 0, 0.2, 1),
  in: Easing.bezier(0.4, 0, 1, 1),
} as const;

/** Scale a base ms by animationSpeed (0.5–2), clamped for readable motion. */
export function speedMs(baseMs: number, speed: number): number {
  const s = Math.max(0.5, Math.min(2, speed || 1));
  return Math.max(100, Math.round(baseMs / s));
}
