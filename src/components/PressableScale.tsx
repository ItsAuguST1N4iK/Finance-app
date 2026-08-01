import React, { memo } from 'react';
import {
  Pressable, type StyleProp, type ViewStyle, type GestureResponderEvent,
  type Insets,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { fpsEasing } from '../theme/fps60';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children?: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number | Insets;
  scaleTo?: number;
  /** timing = scale+opacity; opacity = opacity only; none = plain Pressable (lists). */
  feedback?: 'spring' | 'opacity' | 'none' | 'timing';
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
};

/** 60fps press feedback — timing only (no springs). Prefer none/opacity in lists. */
export const PressableScale = memo(function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  contentStyle,
  disabled,
  hitSlop,
  scaleTo = 0.97,
  feedback = 'timing',
  accessibilityRole = 'button',
  accessibilityLabel,
}: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const mode = feedback === 'spring' ? 'timing' : feedback;
  const light = mode === 'opacity';
  const plain = mode === 'none';

  const animStyle = useAnimatedStyle(() => {
    if (plain) return { opacity: disabled ? 0.55 : 1 };
    if (light) return { opacity: disabled ? 0.55 : opacity.value };
    return {
      transform: [{ scale: scale.value }],
      opacity: disabled ? 0.55 : opacity.value,
    };
  }, [plain, light, disabled]);

  function pressIn() {
    if (disabled || plain) return;
    if (light) {
      opacity.value = withTiming(0.72, { duration: 50, easing: fpsEasing.out });
      return;
    }
    scale.value = withTiming(scaleTo, { duration: 70, easing: fpsEasing.out });
    opacity.value = withTiming(0.92, { duration: 70, easing: fpsEasing.out });
  }

  function pressOut() {
    if (plain) return;
    if (light) {
      opacity.value = withTiming(1, { duration: 90, easing: fpsEasing.out });
      return;
    }
    scale.value = withTiming(1, { duration: 90, easing: fpsEasing.out });
    opacity.value = withTiming(1, { duration: 90, easing: fpsEasing.out });
  }

  if (plain) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          style,
          contentStyle,
          { opacity: disabled ? 0.55 : pressed ? 0.72 : 1 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[style, contentStyle, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});
