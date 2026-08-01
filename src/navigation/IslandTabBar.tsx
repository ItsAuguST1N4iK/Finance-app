import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Text, useWindowDimensions, Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { fpsEasing, speedMs } from '../theme/fps60';
import { radius, stroke } from '../theme/tokens';
import {
  loadShowTabLabels,
  subscribeShowTabLabels,
} from '../security/uiPrefs';
import type { RootTabParamList } from './AppNavigator';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<
  keyof RootTabParamList,
  { icon: IconName; iconOff: IconName }
> = {
  Dashboard:    { icon: 'home',           iconOff: 'home-outline'     },
  Transactions: { icon: 'list',           iconOff: 'list-outline'     },
  Planner:      { icon: 'calendar',       iconOff: 'calendar-outline' },
  Analytics:    { icon: 'bar-chart',      iconOff: 'bar-chart-outline'},
  Settings:     { icon: 'settings-sharp', iconOff: 'settings-outline' },
};

/** Island height with labels (sheet clearance / progress bar). */
export const TAB_ISLAND_HEIGHT = 58;
export const TAB_ISLAND_HEIGHT_COMPACT = 48;
export const TAB_BAR_GAP = 8;

/** Inset so the rolling pill sits inside the island edge. */
const INDICATOR_PAD_X = 4;
const INDICATOR_PAD_Y = 4;

const rollSpring = (speed: number) => ({
  damping: 18,
  stiffness: Math.round(220 * Math.max(0.5, Math.min(2, speed || 1))),
  mass: 0.85,
  overshootClamping: false,
});

function TabItem({
  focused,
  icon,
  iconOff,
  label,
  showLabel,
  color,
  onPress,
}: {
  focused: boolean;
  icon: IconName;
  iconOff: IconName;
  label: string;
  showLabel: boolean;
  color: string;
  onPress: () => void;
}) {
  const { animationSpeed } = useTheme();
  const scale = useSharedValue(focused ? 1.06 : 1);
  const lift = useSharedValue(0);

  useEffect(() => {
    const up = speedMs(90, animationSpeed);
    const down = speedMs(150, animationSpeed);
    if (focused) {
      lift.value = withSequence(
        withTiming(-3, { duration: up, easing: fpsEasing.out }),
        withTiming(0, { duration: down, easing: fpsEasing.out }),
      );
      scale.value = withSequence(
        withTiming(1.14, { duration: up, easing: fpsEasing.out }),
        withTiming(1.06, { duration: down, easing: fpsEasing.out }),
      );
    } else {
      lift.value = withTiming(0, { duration: down, easing: fpsEasing.out });
      scale.value = withTiming(1, { duration: down, easing: fpsEasing.out });
    }
  }, [focused, animationSpeed, lift, scale]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <Ionicons name={focused ? icon : iconOff} size={22} color={color} />
      </Animated.View>
      {showLabel ? (
        <Text
          style={[styles.tabLabel, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function IslandTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, animationSpeed } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const islandWidth = windowWidth - 32;
  const tabCount = Math.max(1, state.routes.length);
  const tabW = islandWidth / tabCount;
  const [showLabels, setShowLabels] = useState(true);

  const islandH = showLabels ? TAB_ISLAND_HEIGHT : TAB_ISLAND_HEIGHT_COMPACT;
  const indicatorW = Math.max(0, tabW - INDICATOR_PAD_X * 2);
  const indicatorH = Math.max(0, islandH - INDICATOR_PAD_Y * 2);
  const indicatorRadius = Math.min(radius.pill, indicatorH / 2);

  // Rolling pill — full tab cell, slides between tabs
  const indicatorX = useSharedValue(
    state.index * tabW + INDICATOR_PAD_X,
  );
  const prevTabW = React.useRef(tabW);
  const ready = React.useRef(false);

  useEffect(() => {
    let alive = true;
    void loadShowTabLabels().then((v) => {
      if (alive) setShowLabels(v);
    });
    return subscribeShowTabLabels(setShowLabels);
  }, []);

  useEffect(() => {
    const target = state.index * tabW + INDICATOR_PAD_X;
    if (!ready.current || prevTabW.current !== tabW) {
      prevTabW.current = tabW;
      indicatorX.value = target;
      ready.current = true;
      return;
    }
    indicatorX.value = withSpring(target, rollSpring(animationSpeed));
  }, [state.index, tabW, animationSpeed, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const TAB_LABELS: Record<keyof RootTabParamList, string> = {
    Dashboard:    t.tabDashboard,
    Transactions: t.tabTransactions,
    Planner:      t.tabPlanner,
    Analytics:    t.tabAnalytics,
    Settings:     t.tabSettings,
  };

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) + TAB_BAR_GAP }]}
      pointerEvents="box-none"
    >
      <View style={[styles.island, {
        width: islandWidth,
        height: islandH,
        backgroundColor: theme.card,
        borderColor: theme.border,
      }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rollingPill,
            {
              top: INDICATOR_PAD_Y,
              width: indicatorW,
              height: indicatorH,
              borderRadius: indicatorRadius,
              backgroundColor: theme.accent,
            },
            indicatorStyle,
          ]}
        />

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icons = TAB_ICONS[route.name as keyof RootTabParamList];
          const label = TAB_LABELS[route.name as keyof RootTabParamList];
          // Icon + label sit on the accent pill when focused
          const color = focused ? theme.onAccent : theme.subtext;

          function onPress() {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <TabItem
              key={route.key}
              focused={focused}
              icon={icons.icon}
              iconOff={icons.iconOff}
              label={label}
              showLabel={showLabels}
              color={color}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  island: {
    borderRadius: radius.fab,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderWidth: stroke.width,
  },
  rollingPill: {
    position: 'absolute',
    left: 0,
    opacity: 1,
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.15,
    maxWidth: '96%',
    textAlign: 'center',
    marginTop: 1,
    lineHeight: 11,
  },
});
