import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { fpsEasing, speedMs } from '../../theme/fps60';
import { radius, stroke } from '../../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Period / parameter chip with select pop animation. */
export function PeriodChip({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) {
  const { theme, animationSpeed } = useTheme();
  const sel = useSharedValue(active ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    sel.value = withTiming(active ? 1 : 0, {
      duration: speedMs(200, animationSpeed),
      easing: fpsEasing.out,
    });
    if (active) {
      pop.value = withSequence(
        withTiming(1.08, { duration: speedMs(90, animationSpeed), easing: fpsEasing.out }),
        withTiming(1, { duration: speedMs(140, animationSpeed), easing: fpsEasing.out }),
      );
    }
  }, [active, animationSpeed, sel, pop]);

  const chipStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(sel.value, [0, 1], [theme.border, theme.accent]),
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      ['transparent', theme.accent],
    ),
    transform: [{ scale: pop.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [theme.subtext, theme.onAccent]),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      style={[pStyles.btn, chipStyle, { marginRight: 8 }]}
    >
      <Animated.Text style={[pStyles.label, labelStyle]}>{label}</Animated.Text>
    </AnimatedPressable>
  );
}

const pStyles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: stroke.width,
    overflow: 'hidden',
  },
  label: { fontSize: 13, fontWeight: '600' },
});
