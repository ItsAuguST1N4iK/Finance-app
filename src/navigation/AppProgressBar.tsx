import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppProgressStore } from '../store/appProgressSlice';

/** Full-width progress strip above the tab island. */
export function AppProgressBar() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const progress = useAppProgressStore((s) => s.progress);

  if (!progress) return null;

  const pct = progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;
  const countLabel = `${progress.current}/${progress.total}`;
  const queueHint = progress.queueLeft && progress.queueLeft > 0
    ? t.appProgressQueueLeft.replace('{n}', String(progress.queueLeft))
    : null;

  // Sit just above the floating island tab bar (~62 + safe area)
  const bottom = insets.bottom + 70;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom,
          backgroundColor: theme.isDark ? '#141414' : '#f4f4f5',
          borderColor: theme.border,
        },
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
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
      </View>
      {queueHint ? (
        <Text style={[styles.queue, { color: theme.subtext }]} numberOfLines={1}>
          {queueHint}
        </Text>
      ) : null}
    </View>
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
