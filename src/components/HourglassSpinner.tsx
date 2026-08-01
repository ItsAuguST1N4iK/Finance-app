import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { speedMs } from '../theme/fps60';

/** Flipping hourglass while exchange rates (or any) refresh is in flight. */
export function HourglassSpinner({
  active,
  size = 18,
  color,
}: {
  active: boolean;
  size?: number;
  color?: string;
}) {
  const { theme, animationSpeed } = useTheme();
  const flip = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(flip);
      flip.value = withTiming(0, { duration: 120 });
      return;
    }
    const half = speedMs(520, animationSpeed);
    flip.value = 0;
    flip.value = withRepeat(
      withSequence(
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: speedMs(180, animationSpeed) }),
        withTiming(2, { duration: half, easing: Easing.inOut(Easing.cubic) }),
        withTiming(2, { duration: speedMs(180, animationSpeed) }),
      ),
      -1,
      false,
    );
  }, [active, animationSpeed, flip]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flip.value * 180}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons
        name="hourglass-outline"
        size={size}
        color={color ?? theme.accent}
      />
    </Animated.View>
  );
}
