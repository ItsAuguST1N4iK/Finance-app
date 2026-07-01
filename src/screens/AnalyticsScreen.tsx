import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import { useAnalyticsStore } from '../store/analyticsSlice';
import { useTheme } from '../theme/ThemeContext';
import type { AnalyticsFilters } from '../types';

type PeriodPreset = NonNullable<AnalyticsFilters['periodPreset']>;

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'this_month',  label: 'Цей місяць'  },
  { key: 'last_month',  label: 'Мин. місяць' },
  { key: 'this_year',   label: 'Цей рік'     },
  { key: 'last_year',   label: 'Мин. рік'    },
  { key: 'all',         label: 'Весь час'    },
];

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.kpiLabel, { color: theme.subtext }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: color ?? theme.text }]}>{value}</Text>
    </View>
  );
}

function PlatformRow({ platform, total, sharePct, type }: {
  platform: string; total: number; sharePct: number; type: string;
}) {
  const { theme } = useTheme();
  const color = type === 'income' ? theme.income : theme.expense;
  return (
    <View style={styles.platformRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.platformHeader}>
          <Text style={[styles.platformName, { color: theme.text }]}>{platform.toUpperCase()}</Text>
          <Text style={[styles.platformPct, { color }]}>{sharePct.toFixed(1)}%</Text>
        </View>
        <View style={[styles.barBg, { backgroundColor: theme.border }]}>
          <View style={[styles.barFill, { width: `${Math.min(sharePct, 100)}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[styles.platformTotal, { color: theme.text }]}>
        {total.toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
      </Text>
    </View>
  );
}

function SimpleBarChart({ labels, values, color, subTextColor, width }: {
  labels: string[]; values: number[]; color: string; subTextColor: string; width: number;
}) {
  const height = 180;
  const padL = 8; const padR = 8; const padT = 24; const padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const max = Math.max(...values, 1);
  const barW = Math.max(8, Math.floor(chartW / Math.max(labels.length, 1)) - 6);

  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * chartH);
        const x = padL + i * (chartW / labels.length) + (chartW / labels.length - barW) / 2;
        const y = padT + chartH - barH;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.9} />
            {v > 0 && (
              <SvgText x={x + barW / 2} y={y - 4} fontSize={9} fill={color} textAnchor="middle">
                {v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))}
              </SvgText>
            )}
            <SvgText x={x + barW / 2} y={height - 6} fontSize={10} fill={subTextColor} textAnchor="middle">
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function AnalyticsScreen() {
  const { theme } = useTheme();
  const { width: SCREEN_W } = useWindowDimensions();
  const { summary, platformShares, topCategories, filters, setFilters, compute, isLoading } =
    useAnalyticsStore();

  useEffect(() => { compute(); }, []);

  const totals = summary.reduce(
    (acc, s) => ({
      income:  acc.income  + s.totalIncome,
      expense: acc.expense + s.totalExpense,
      fees:    acc.fees    + s.totalFees,
      net:     acc.net     + s.netResult,
    }),
    { income: 0, expense: 0, fees: 0, net: 0 }
  );

  const incomeShares = platformShares.filter((s) => s.type === 'income');
  const expShares    = platformShares.filter((s) => s.type === 'expense');

  const months      = [...new Set(summary.map((s) => s.period))].sort().slice(-6);
  const chartValues = months.map((m) =>
    summary.filter((s) => s.period === m).reduce((sum, s) => sum + s.totalIncome, 0)
  );
  const chartLabels = months.map((m) => m.slice(5));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Period presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsRow}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {PRESETS.map((p) => {
            const active = filters.periodPreset === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.preset,
                  { borderColor: theme.border },
                  active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => setFilters({ periodPreset: p.key })}
              >
                <Text style={[styles.presetText,
                  { color: active ? '#fff' : theme.subtext }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KpiCard label="Доходи"   value={`${totals.income.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`}  color={theme.income}  />
          <KpiCard label="Витрати"  value={`${totals.expense.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`} color={theme.expense} />
          <KpiCard label="Комісії"  value={`${totals.fees.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`}    color={theme.warning} />
          <KpiCard label="Результат" value={`${totals.net >= 0 ? '+' : ''}${totals.net.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`}
            color={totals.net >= 0 ? theme.income : theme.expense} />
        </View>

        {/* Bar chart */}
        {months.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Доходи по місяцях</Text>
            <View style={[styles.chartCard, { backgroundColor: theme.card, width: SCREEN_W - 32 }]}>
              <SimpleBarChart
                labels={chartLabels}
                values={chartValues}
                color={theme.income}
                subTextColor={theme.subtext}
                width={SCREEN_W - 32}
              />
            </View>
          </View>
        )}

        {/* Platform income shares */}
        {incomeShares.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Джерела доходів</Text>
            {incomeShares.map((s) => (
              <PlatformRow key={`${s.platform}-income`} platform={s.platform}
                total={s.platformTotal} sharePct={s.sharePct} type="income" />
            ))}
          </View>
        )}

        {/* Platform expense shares */}
        {expShares.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Витрати по платформах</Text>
            {expShares.map((s) => (
              <PlatformRow key={`${s.platform}-expense`} platform={s.platform}
                total={s.platformTotal} sharePct={s.sharePct} type="expense" />
            ))}
          </View>
        )}

        {/* Top categories */}
        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Топ категорій витрат</Text>
            {topCategories.map((c, i) => (
              <View key={c.category} style={[styles.catRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.catRank, { color: theme.subtext }]}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catName, { color: theme.text }]}>{c.category}</Text>
                  <Text style={[styles.catCount, { color: theme.subtext }]}>{c.txCount} транзакцій</Text>
                </View>
                <Text style={[styles.catTotal, { color: theme.text }]}>
                  {c.total.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
                </Text>
              </View>
            ))}
          </View>
        )}

        {summary.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              Немає даних для вибраного періоду
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  presetsRow:  { flexGrow: 0, marginVertical: 12 },
  preset: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginRight: 8, borderWidth: 1,
  },
  presetText:  { fontSize: 13 },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8, marginBottom: 8,
  },
  kpiCard: {
    borderRadius: 12, padding: 14,
    flexBasis: '47%', flexGrow: 1,
  },
  chartCard: {
    borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 4, overflow: 'hidden',
  },
  kpiLabel:  { fontSize: 12, marginBottom: 4 },
  kpiValue:  { fontSize: 20, fontWeight: '700' },
  section:      { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  platformRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  platformHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  platformName:   { fontSize: 13, fontWeight: '600' },
  platformPct:    { fontSize: 13, fontWeight: '600' },
  barBg:    { height: 6, borderRadius: 3 },
  barFill:  { height: 6, borderRadius: 3 },
  platformTotal: { fontSize: 13, marginLeft: 12, minWidth: 70, textAlign: 'right' },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  catRank:  { fontSize: 13, width: 28 },
  catName:  { fontSize: 14 },
  catCount: { fontSize: 12 },
  catTotal: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText:  { fontSize: 15 },
});
