import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { fpsEasing, speedMs } from '../theme/fps60';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Ignored — replaying enter on filter/period changes caused janky full-tree paints. */
  replayKey?: string | number;
};

/** Soft screen paint-in once on mount — opacity only, short. */
export function ScreenEnter({ children, style }: Props) {
  const { animationSpeed } = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: speedMs(100, animationSpeed),
      easing: fpsEasing.out,
    });
  }, [animationSpeed, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle, style]}>
      {children}
    </Animated.View>
  );
}
