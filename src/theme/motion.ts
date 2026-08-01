import { Easing } from 'react-native';

/**
 * Shared easing / spring presets for legacy RN Animated call sites.
 * Prefer `reMotion` + Reanimated for new / hot-path UI motion.
 */
export const motion = {
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  easeOutSoft: Easing.bezier(0.33, 0.0, 0.2, 1),
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
  easeIn: Easing.bezier(0.3, 0, 0.8, 0.15),
  springIndicator: {
    damping: 24,
    stiffness: 260,
    mass: 0.85,
    overshootClamping: false,
    restDisplacementThreshold: 0.15,
    restSpeedThreshold: 0.15,
    useNativeDriver: true as const,
  },
  springSheet: {
    damping: 28,
    stiffness: 220,
    mass: 1,
    overshootClamping: true,
    restDisplacementThreshold: 0.3,
    restSpeedThreshold: 0.3,
    useNativeDriver: true as const,
  },
  springTap: {
    damping: 18,
    stiffness: 280,
    mass: 0.75,
    overshootClamping: true,
    useNativeDriver: true as const,
  },
  springDialog: {
    damping: 24,
    stiffness: 240,
    mass: 0.95,
    overshootClamping: false,
    useNativeDriver: true as const,
  },
} as const;

export function clampMotionMs(ms: number, min = 140): number {
  return Math.max(min, Math.round(ms));
}

type SpringCfg = {
  damping: number;
  stiffness: number;
  mass?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
  useNativeDriver: true;
};

export function springWithSpeed(base: SpringCfg, speed: number): SpringCfg {
  const s = Math.max(0.5, Math.min(2, speed));
  return {
    ...base,
    stiffness: base.stiffness * s,
    damping: base.damping * Math.sqrt(s),
  };
}

/**
 * LayoutAnimation is a no-op on New Architecture and caused choppy list updates.
 * Kept as a no-op so call sites stay compiling without side effects.
 */
export function configureLayoutMotion(_durationMs: number): void {
  // intentionally empty
}
