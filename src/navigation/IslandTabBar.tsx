import React, { useRef, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Dimensions, Text,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
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

const ISLAND_WIDTH  = Dimensions.get('window').width - 32;
const TAB_COUNT     = 5;
const TAB_W         = ISLAND_WIDTH / TAB_COUNT;

export function IslandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, animationSpeed, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const insets    = useSafeAreaInsets();

  const TAB_LABELS: Record<keyof RootTabParamList, string> = {
    Dashboard:    t.tabDashboard,
    Transactions: t.tabTransactions,
    Planner:      t.tabPlanner,
    Analytics:    t.tabAnalytics,
    Settings:     t.tabSettings,
  };

  const indicatorX  = useRef(new Animated.Value(state.index * TAB_W)).current;
  const indicatorOff = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue:       state.index * TAB_W,
      useNativeDriver: true,
      stiffness:     200 * animationSpeed,
      damping:       28,
      mass:          1,
    }).start();
  }, [state.index, animationSpeed]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
      <View style={[styles.island, cardSurface(true), { shadowColor: theme.shadow }]}>
        {/* Animated slider pill */}
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: theme.accent + '28', width: TAB_W - 16 },
            { transform: [{ translateX: Animated.add(indicatorX, indicatorOff) }] },
          ]}
        />

        {state.routes.map((route, index) => {
          const focused  = state.index === index;
          const icons    = TAB_ICONS[route.name as keyof RootTabParamList];
          const label    = TAB_LABELS[route.name as keyof RootTabParamList];
          const opts     = descriptors[route.key].options;
          const color    = focused ? theme.accent : theme.subtext;

          function onPress() {
            const event = navigation.emit({
              type:     'tabPress',
              target:   route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.7}
              hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
            >
              <Animated.View style={styles.tabInner}>
                <Ionicons
                  name={focused ? icons.icon : icons.iconOff}
                  size={22}
                  color={color}
                />
                <Text
                  style={[styles.tabLabel, { color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  island: {
    width:         ISLAND_WIDTH,
    height:        62,
    borderRadius:  28,
    flexDirection: 'row',
    overflow:      'hidden',
    shadowOpacity: 0.35,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     16,
  },
  indicator: {
    position:     'absolute',
    top:          6,
    bottom:       6,
    borderRadius: 20,
  },
  tab: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tabInner: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  tabLabel: {
    fontSize:   9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
