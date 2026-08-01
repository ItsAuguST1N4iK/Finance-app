import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppProgressStore } from '../store/appProgressSlice';
import { reEasing } from '../theme/reMotion';
import { TAB_BAR_GAP, TAB_ISLAND_HEIGHT } from './IslandTabBar';

/** Full-width progress strip — UI-thread appear + fill (no JS-driver width). */
export function AppProgressBar() {
  const { theme, calmDur } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const progress = useAppProgressStore((s) => s.progress);
  const fillPct = useSharedValue(0);
  const appear = useSharedValue(0);

  const pct = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  useEffect(() => {
    if (!progress) {
      appear.value = 0;
      fillPct.value = 0;
      return;
    }
    appear.value = withTiming(1, {
      duration: calmDur(360),
      easing: reEasing.easeOut,
    });
    fillPct.value = withTiming(pct, {
      duration: calmDur(520),
      easing: reEasing.easeOut,
    });
  }, [progress, pct, calmDur, appear, fillPct]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateY: (1 - appear.value) * 8 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillPct.value}%`,
  }));

  if (!progress) return null;

  const countLabel = `${progress.current}/${progress.total}`;
  const queueHint = progress.queueLeft && progress.queueLeft > 0
    ? t.appProgressQueueLeft.replace('{n}', String(progress.queueLeft))
    : null;

  const bottom = Math.max(insets.bottom, 8) + TAB_ISLAND_HEIGHT + TAB_BAR_GAP;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom,
          backgroundColor: theme.isDark ? '#141414' : '#f4f4f5',
          borderColor: theme.border,
        },
        wrapStyle,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.step, { color: theme.text }]} numberOfLines={1}>
          {progress.step}
        </Text>
        <Text style={[styles.count, { color: theme.accent }]}>{countLabel}</Text>
        <Text style={[styles.pct, { color: theme.subtext }]}>{pct}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.isDark ? '#1a1a1a' : '#d4d4d4' }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.accent }, fillStyle]} />
      </View>
      {queueHint ? (
        <Text style={[styles.queue, { color: theme.subtext }]} numberOfLines={1}>
          {queueHint}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  step: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
  },
  pct: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  queue: {
    marginTop: 4,
    fontSize: 10,
  },
});
