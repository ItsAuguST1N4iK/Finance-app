import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import type { SyncProgress } from '../../api/monobank';

export function SyncBanner({ progress }: { progress: SyncProgress | null }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  if (!progress) return null;
  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  return (
    <View style={[bnS.wrap, { backgroundColor: theme.card, borderColor: theme.accent }]}>
      <View style={bnS.row}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[bnS.step, { color: theme.text }]} numberOfLines={1}>{progress.step}</Text>
        <Text style={[bnS.pct, { color: theme.accent }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[bnS.track, { backgroundColor: theme.border }]}>
        <View style={[bnS.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
      </View>
      {progress.total > 1 && (
        <Text style={[bnS.hint, { color: theme.subtext }]}>
          {t.settingsApiRateLimit
            .replace('{current}', String(progress.current))
            .replace('{total}', String(progress.total))}
        </Text>
      )}
    </View>
  );
}

const bnS = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  step: { flex: 1, fontSize: 13 },
  pct:  { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
  hint:  { fontSize: 11, marginTop: 6 },
});
