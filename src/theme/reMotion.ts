/**
 * UI-thread motion (Reanimated 4).
 * Prefer these over RN Animated — layout props (height) run smoothly here.
 */
import { Easing } from 'react-native-reanimated';

export const reEasing = {
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  easeOutSoft: Easing.bezier(0.33, 0, 0.2, 1),
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
  easeIn: Easing.bezier(0.3, 0, 0.8, 0.15),
} as const;

export const reSpring = {
  tap: { damping: 18, stiffness: 280, mass: 0.75 },
  indicator: { damping: 24, stiffness: 260, mass: 0.85 },
  sheet: { damping: 26, stiffness: 240, mass: 0.95, overshootClamping: true },
  dialog: { damping: 22, stiffness: 260, mass: 0.9 },
} as const;

/** Scale spring with animationSpeed (0.5–2). */
export function reSpringWithSpeed<T extends { damping: number; stiffness: number; mass?: number }>(
  base: T,
  speed: number,
): T {
  const s = Math.max(0.5, Math.min(2, speed));
  return {
    ...base,
    stiffness: base.stiffness * s,
    damping: base.damping * Math.sqrt(s),
  };
}
