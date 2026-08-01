import React, { useEffect, useRef } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fpsEasing, speedMs } from '../theme/fps60';
import { PressableScale } from './PressableScale';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

/** Plus icon that spins 360° on press (planner FAB / add actions). */
export function SpinAddButton({
  onPress,
  style,
  size = 28,
  color,
  scaleTo = 0.9,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  size?: number;
  color?: string;
  scaleTo?: number;
}) {
  const { theme, animationSpeed } = useTheme();
  const spin = useSharedValue(0);

  function handlePress() {
    onPress();
    spin.value = 0;
    spin.value = withTiming(1, {
      duration: speedMs(360, animationSpeed),
      easing: fpsEasing.inOut,
    });
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <PressableScale style={style} onPress={handlePress} scaleTo={scaleTo} feedback="opacity">
      <Animated.View style={animStyle}>
        <Ionicons name="add" size={size} color={color ?? theme.onAccent} />
      </Animated.View>
    </PressableScale>
  );
}

/** Pencil / trash: shake then fire action. */
export function WiggleActionIcon({
  name,
  size,
  color,
  onPress,
  style,
  hitSlop,
}: {
  name: IonName;
  size: number;
  color: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
}) {
  const { animationSpeed } = useTheme();
  const rot = useSharedValue(0);
  const busy = useRef(false);

  function clearBusy() {
    busy.current = false;
  }

  function handlePress() {
    if (busy.current) return;
    busy.current = true;
    const d = speedMs(45, animationSpeed);
    rot.value = withSequence(
      withTiming(-14, { duration: d, easing: fpsEasing.out }),
      withTiming(14, { duration: d, easing: fpsEasing.inOut }),
      withTiming(-10, { duration: d, easing: fpsEasing.inOut }),
      withTiming(10, { duration: d, easing: fpsEasing.inOut }),
      withTiming(0, { duration: speedMs(70, animationSpeed), easing: fpsEasing.out }, (finished) => {
        runOnJS(clearBusy)();
        if (finished) runOnJS(onPress)();
      }),
    );
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <PressableScale style={style} onPress={handlePress} hitSlop={hitSlop} scaleTo={0.9} feedback="opacity">
      <Animated.View style={animStyle}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
    </PressableScale>
  );
}

/** Chevron that rotates smoothly between collapsed / expanded. */
export function ChevronToggle({
  expanded,
  size = 18,
  color,
}: {
  expanded: boolean;
  size?: number;
  color: string;
}) {
  const { animationSpeed } = useTheme();
  const open = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    open.value = withTiming(expanded ? 1 : 0, {
      duration: speedMs(220, animationSpeed),
      easing: fpsEasing.out,
    });
  }, [expanded, animationSpeed, open]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${open.value * 180}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name="chevron-down" size={size} color={color} />
    </Animated.View>
  );
}
