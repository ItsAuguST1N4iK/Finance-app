import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { fpsEasing, speedMs } from '../theme/fps60';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Custom switch — accent fill + thumb slide (Reanimated, ~60fps).
 * Replaces RN Switch for consistent motion with the rest of the app.
 */
export function AnimatedSwitch({ value, onValueChange, disabled }: Props) {
  const { theme, animationSpeed } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  const bump = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: speedMs(220, animationSpeed),
      easing: fpsEasing.out,
    });
    bump.value = withTiming(1.06, { duration: 80, easing: fpsEasing.out }, () => {
      bump.value = withTiming(1, { duration: 120, easing: fpsEasing.out });
    });
  }, [value, animationSpeed, progress, bump]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.border, theme.accent + 'AA'],
    ),
    transform: [{ scaleX: bump.value }, { scaleY: 2 - bump.value }],
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * 20 },
      { scale: bump.value },
    ],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.subtext, theme.accent],
    ),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        if (disabled) return;
        onValueChange(!value);
      }}
      style={disabled ? { opacity: 0.45 } : undefined}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
