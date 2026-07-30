import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { currencySymbol } from '../../utils/currency';
import { dateFnsLocale, numberLocale } from '../../utils/locale';
import { radius, space, type } from '../../theme/tokens';
import type { IbkrHoldingEstimate } from '../../utils/ibkrHoldings';

const HOLDING_COLORS = [
  '#F5A623', '#4CAF50', '#42A5F5', '#AB47BC', '#EF5350',
  '#26A69A', '#FF7043', '#7E57C2', '#66BB6A', '#29B6F6',
];

export function IbkrHoldingsSection({
  holdings,
  investedTotal,
  marketValue,
  buyCount = 0,
  homeCurrency,
}: {
  holdings: IbkrHoldingEstimate[];
  investedTotal: number;
  marketValue: number;
  buyCount?: number;
  homeCurrency: string;
}) {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const dateLoc = dateFnsLocale(language);
  const sym = currencySymbol(homeCurrency);

  if (holdings.length === 0 && investedTotal <= 0) return null;

  const fmt = (v: number, digits = 0) =>
    v.toLocaleString(loc, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

  const sorted = [...holdings]
    .filter((h) => h.marketValue > 0)
    .sort((a, b) => b.marketValue - a.marketValue);
  const totalForBar = sorted.reduce((s, h) => s + h.marketValue, 0);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.subtext }]}>{t.analyticsInvestments}</Text>
      <Text style={[styles.hint, { color: theme.subtext }]}>{t.analyticsIbkrPortfolioHint}</Text>

      <View style={styles.kpiRow}>
        <View style={[styles.kpi, cardSurface(), { borderLeftColor: theme.accent }]}>
          <Text style={[styles.kpiLabel, { color: theme.subtext }]}>{t.analyticsInvested}</Text>
          <Text style={[styles.kpiValue, { color: theme.accent }]}>
            {fmt(investedTotal)} {sym}
          </Text>
          <Text style={[styles.meta, { color: theme.subtext }]}>
            {t.analyticsInvestmentsHint}
          </Text>
        </View>
        <View style={[styles.kpi, cardSurface(), { borderLeftColor: theme.income }]}>
          <Text style={[styles.kpiLabel, { color: theme.subtext }]}>{t.analyticsIbkrEstimate}</Text>
          <Text style={[styles.kpiValue, { color: theme.income }]}>
            {fmt(marketValue)} {sym}
          </Text>
        </View>
      </View>

      {sorted.length > 0 && (
        <View style={styles.shareBlock}>
          <Text style={[styles.shareTitle, { color: theme.subtext }]}>{t.analyticsFundsShare}</Text>
          <View style={[styles.stackedBar, { backgroundColor: theme.border }]}>
            {sorted.map((h, i) => {
              const pct = totalForBar > 0 ? (h.marketValue / totalForBar) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <View
                  key={h.symbol}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: HOLDING_COLORS[i % HOLDING_COLORS.length],
                    height: '100%',
                  }}
                />
              );
            })}
          </View>
          {sorted.map((h, i) => {
            const pct = totalForBar > 0 ? (h.marketValue / totalForBar) * 100 : 0;
            const color = HOLDING_COLORS[i % HOLDING_COLORS.length];
            return (
              <View key={h.symbol} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sym, { color: theme.text }]}>{h.symbol}</Text>
                  <Text style={[styles.qty, { color: theme.subtext }]}>
                    ~{fmt(h.quantity, 4)}
                    {h.lastTradeDate
                      ? ` · ${format(h.lastTradeDate, 'd MMM yyyy', { locale: dateLoc })}`
                      : ''}
                  </Text>
                </View>
                <Text style={[styles.pct, { color: theme.subtext }]}>{fmt(pct, 1)}%</Text>
                <Text style={[styles.amt, { color: theme.text }]}>
                  {fmt(h.marketValue)} {sym}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 20 },
  title: { ...type.section, marginBottom: 4 },
  hint: { fontSize: 11, marginBottom: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpi: {
    flex: 1, borderRadius: radius.md, padding: space[3],
    borderLeftWidth: 3,
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 10, marginTop: 4 },
  shareBlock: { marginTop: 4 },
  shareTitle: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  stackedBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sym: { fontSize: 13, fontWeight: '700' },
  qty: { fontSize: 11, marginTop: 1 },
  pct: { fontSize: 12, fontWeight: '600', minWidth: 44, textAlign: 'right' },
  amt: { fontSize: 12, fontWeight: '700', minWidth: 64, textAlign: 'right' },
});
