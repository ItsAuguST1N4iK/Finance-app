import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { numberLocale } from '../../utils/locale';

export const PLATFORM_COLORS: Record<string, string> = {
  monobank:   '#3b82f6',
  privatbank: '#10b981',
  zen:        '#8b5cf6',
  ibkr:       '#f59e0b',
  manual:     '#64748b',
};

export interface PlatformShareItem {
  accountId: string;
  accountName: string;
  total: number;
  pct: number;
  color: string;
}

export function PlatformShareBar({ title, items }: { title?: string; items: PlatformShareItem[] }) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const loc = numberLocale(language);
  const fmt = (v: number) => v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString(loc, { maximumFractionDigits: 0 });

  if (items.length === 0) return null;

  return (
    <View style={platStyles.wrap}>
      {title ? (
        <Text style={[platStyles.subTitle, { color: theme.subtext }]}>{title}</Text>
      ) : null}
      <View style={[platStyles.stackedBar, { backgroundColor: theme.border }]}>
        {items.filter((item) => item.pct > 0).map((item) => (
          <View
            key={item.accountId}
            style={{ width: `${item.pct}%`, backgroundColor: item.color, height: '100%' }}
          />
        ))}
      </View>
      {items.map((item) => (
        <View key={item.accountId} style={platStyles.legendRow}>
          <View style={platStyles.legendLeft}>
            <View style={[platStyles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[platStyles.name, { color: theme.text }]} numberOfLines={1}>{item.accountName}</Text>
          </View>
          <Text style={[platStyles.pctLabel, { color: theme.subtext }]}>
            {item.pct.toFixed(1)}%
          </Text>
          <Text style={[platStyles.amount, { color: theme.text }]}>{fmt(item.total)}</Text>
        </View>
      ))}
    </View>
  );
}

const platStyles = StyleSheet.create({
  wrap:       { marginBottom: 16 },
  subTitle:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  stackedBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  name:       { fontSize: 12, fontWeight: '600' },
  pctLabel:   { fontSize: 12, fontWeight: '600', minWidth: 44, textAlign: 'right' },
  amount:     { fontSize: 12, fontWeight: '700', minWidth: 48, textAlign: 'right' },
});
