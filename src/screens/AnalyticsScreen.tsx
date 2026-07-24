import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, useWindowDimensions, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Rect, Text as SvgText, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAnalyticsStore, ChartBar } from '../store/analyticsSlice';
import { computeYearBands, computePerBarBands, isYearGranularity, type ChartGranularity } from '../utils/chartGranularity';
import { formatMonthYearLabel } from '../utils/chartLabels';
import { useExchangeRatesStore } from '../store/exchangeRatesSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DatePickerModal } from '../components/DatePickerModal';
import { currencySymbol } from '../utils/currency';
import { useCategoryLabel } from '../hooks/useCategoryLabels';
import type { AnalyticsFilters } from '../types';

type PeriodPreset = NonNullable<AnalyticsFilters['periodPreset']>;

function CategoryRowName({ categoryKey }: { categoryKey: string }) {
  const { theme } = useTheme();
  const label = useCategoryLabel(categoryKey);
  return <Text style={[styles.catName, { color: theme.text }]}>{label}</Text>;
}

interface KpiData {
  label: string;
  value: string;
  color: string;
  icon: string;
  sub?: string;
}

function KpiCards({ items }: { items: KpiData[] }) {
  const { theme, cardSurface } = useTheme();
  const surface = cardSurface();
  return (
    <View style={kpiStyles.row}>
      {items.map((item, idx) => (
        <View
          key={idx}
          style={[kpiStyles.card, surface, {
            borderLeftColor: item.color,
            borderLeftWidth: 3,
          }]}
        >
          <View style={kpiStyles.cardTop}>
            <Text style={[kpiStyles.label, { color: theme.subtext }]}>{item.label}</Text>
            <View style={[kpiStyles.iconWrap, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon as any} size={14} color={item.color} />
            </View>
          </View>
          <Text style={[kpiStyles.value, { color: item.color }]} numberOfLines={1} adjustsFontSizeToFit>
            {item.value}
          </Text>
          {item.sub && (
            <Text style={[kpiStyles.sub, { color: theme.subtext }]}>{item.sub}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  card: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:   { fontSize: 12, fontWeight: '500' },
  iconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  value:   { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sub:     { fontSize: 11, marginTop: 4 },
});

// ─── Smooth bezier path helper ────────────────────────

function smoothBezierPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  const tension = 0.35;
  let d = `M ${pts[0].x},${pts[0].y}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const pp   = pts[Math.max(0, i - 2)];
    const next = pts[Math.min(pts.length - 1, i + 1)];

    const cp1x = prev.x + tension * (curr.x - pp.x) / 2;
    const cp1y = prev.y + tension * (curr.y - pp.y) / 2;
    const cp2x = curr.x - tension * (next.x - prev.x) / 2;
    const cp2y = curr.y - tension * (next.y - prev.y) / 2;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${curr.x},${curr.y}`;
  }
  return d;
}

// ─── Dual Bar Chart (income + expense) ───────────────

function BarChart({ bars, subTextColor, width, granularity, periodFooter }: {
  bars: ChartBar[];
  subTextColor: string;
  width: number;
  granularity: ChartGranularity;
  periodFooter?: string;
}) {
  const { theme } = useTheme();
  if (bars.length === 0) return null;

  const height = 218;
  const padL   = 8;
  const padR   = 8;
  const padT   = 24;
  const padB   = 52;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const baseline = padT + chartH;
  const yearBandH = 16;
  const yearBandY = height - yearBandH - 2;

  const yearMode = isYearGranularity(granularity);
  const monthMode = granularity === 'monthly';
  const bandMode = yearMode || monthMode;
  const yearBands = bandMode ? computePerBarBands(bars) : computeYearBands(bars);
  const showYearBands = bandMode
    ? yearBands.length > 0
    : yearBands.length > 1 || (yearBands.length === 1 && bars.length > 4);
  const hideTextLabels = bandMode;

  const maxVal = Math.max(...bars.map((b) => Math.max(b.income, b.expense)), 1);

  const guideLines = [0.25, 0.5, 0.75, 1.0].map((frac) => ({
    y: padT + chartH - frac * chartH,
    val: (maxVal * frac),
  }));

  const minGroupW = monthMode ? 34 : 28;
  const showEvery = bars.length * minGroupW > chartW
    ? Math.ceil((bars.length * minGroupW) / chartW / 2)
    : bars.length > 20
      ? Math.ceil(bars.length / 12)
      : 1;
  const groupW    = chartW / bars.length;
  const gap       = Math.max(1, groupW * 0.08);
  const barW      = Math.max(2, Math.floor((groupW - gap) / 2) - 1);

  const incomePts  = bars.map((b, i) => ({
    x: padL + i * groupW + groupW / 2,
    y: padT + chartH - Math.max(2, (b.income / maxVal) * chartH),
  }));
  const expensePts = bars.map((b, i) => ({
    x: padL + i * groupW + groupW / 2,
    y: padT + chartH - Math.max(2, (b.expense / maxVal) * chartH),
  }));

  const incomePath  = smoothBezierPath(incomePts);
  const expensePath = smoothBezierPath(expensePts);

  const incomeAreaPath  = incomePath  + ` L ${incomePts[incomePts.length - 1].x},${baseline} L ${incomePts[0].x},${baseline} Z`;
  const expenseAreaPath = expensePath + ` L ${expensePts[expensePts.length - 1].x},${baseline} L ${expensePts[0].x},${baseline} Z`;

  return (
    <Svg width={width} height={height}>
      {guideLines.map((gl, idx) => (
        <React.Fragment key={idx}>
          <Line
            x1={padL} y1={gl.y}
            x2={width - padR} y2={gl.y}
            stroke={subTextColor} strokeWidth={0.4} opacity={0.2}
            strokeDasharray="4,4"
          />
        </React.Fragment>
      ))}
      <Path d={incomeAreaPath}  fill={theme.income}  opacity={0.08} />
      <Path d={expenseAreaPath} fill={theme.expense} opacity={0.08} />
      {bars.map((bar, i) => {
        const groupX    = padL + i * groupW;
        const incomeH   = Math.max(2, (bar.income / maxVal) * chartH);
        const expenseH  = Math.max(2, (bar.expense / maxVal) * chartH);
        const centerX   = groupX + (groupW - barW * 2 - gap) / 2;
        const incomeX   = centerX;
        const expenseX  = centerX + barW + gap;
        const showLabel = !hideTextLabels && i % showEvery === 0;

        return (
          <React.Fragment key={i}>
            <Rect x={incomeX} y={padT + chartH - incomeH} width={barW} height={incomeH}
              rx={Math.min(barW / 2, 3)} fill={theme.income} opacity={0.65} />
            <Rect x={expenseX} y={padT + chartH - expenseH} width={barW} height={expenseH}
              rx={Math.min(barW / 2, 3)} fill={theme.expense} opacity={0.65} />
            {showLabel && (
              <SvgText
                x={groupX + groupW / 2}
                y={showYearBands ? baseline + 14 : height - 8}
                fontSize={9}
                fill={subTextColor}
                textAnchor="middle"
              >
                {bar.label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
      {showYearBands && yearBands.map((band) => {
        const x1 = padL + band.startIdx * groupW;
        const x2 = padL + (band.endIdx + 1) * groupW;
        const cx = (x1 + x2) / 2;
        return (
          <React.Fragment key={`y-${band.year}-${band.startIdx}`}>
            <Rect
              x={x1 + 1}
              y={yearBandY}
              width={Math.max(0, x2 - x1 - 2)}
              height={yearBandH}
              fill={theme.accent}
              opacity={0.28}
              rx={3}
            />
            <Line
              x1={x1 + 1}
              y1={yearBandY}
              x2={x2 - 1}
              y2={yearBandY}
              stroke={theme.accent}
              strokeWidth={2}
            />
            <SvgText
              x={cx}
              y={yearBandY + yearBandH - 3}
              fontSize={yearMode ? 9 : 11}
              fill={theme.accent}
              textAnchor="middle"
            >
              {band.label ?? band.year}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Path d={incomePath}  fill="none" stroke={theme.income}  strokeWidth={2} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={expensePath} fill="none" stroke={theme.expense} strokeWidth={2} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
      {incomePts.filter((_, i) => i % showEvery === 0).map((pt, i) => (
        <Line key={`id${i}`} x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y} stroke={theme.income} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
      ))}
      {expensePts.filter((_, i) => i % showEvery === 0).map((pt, i) => (
        <Line key={`ed${i}`} x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y} stroke={theme.expense} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
      ))}
      {periodFooter && !showYearBands && (
        <React.Fragment>
          <Rect x={padL + 1} y={yearBandY} width={chartW - 2} height={yearBandH}
            fill={theme.accent} opacity={0.28} rx={3} />
          <Line x1={padL + 1} y1={yearBandY} x2={width - padR - 1} y2={yearBandY}
            stroke={theme.accent} strokeWidth={2} />
          <SvgText x={width / 2} y={yearBandY + yearBandH - 3} fontSize={10}
            fill={theme.accent} textAnchor="middle">{periodFooter}</SvgText>
        </React.Fragment>
      )}
      <Line x1={padL} y1={baseline} x2={width - padR} y2={baseline}
        stroke={subTextColor} strokeWidth={0.6} opacity={0.4} />
    </Svg>
  );
}

// ─── Legend ───────────────────────────────────────────

function ChartLegend() {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  return (
    <View style={legendStyles.row}>
      <View style={legendStyles.item}>
        <View style={[legendStyles.dot, { backgroundColor: theme.income }]} />
        <Text style={[legendStyles.label, { color: theme.subtext }]}>{t.analyticsShowIncome}</Text>
      </View>
      <View style={legendStyles.item}>
        <View style={[legendStyles.dot, { backgroundColor: theme.expense }]} />
        <Text style={[legendStyles.label, { color: theme.subtext }]}>{t.analyticsShowExpense}</Text>
      </View>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 16, marginBottom: 8 },
  item:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:   { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 12 },
});

// ─── Combined Platform Row (100% stacked share bar) ───

const PLATFORM_COLORS: Record<string, string> = {
  monobank:   '#3b82f6',
  privatbank: '#10b981',
  zen:        '#8b5cf6',
  ibkr:       '#f59e0b',
  manual:     '#64748b',
};

interface PlatformShareItem {
  accountId: string;
  accountName: string;
  total: number;
  pct: number;
  color: string;
}

function PlatformShareBar({ title, items }: { title?: string; items: PlatformShareItem[] }) {
  const { theme } = useTheme();
  const fmt = (v: number) => v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString('uk-UA', { maximumFractionDigits: 0 });

  if (items.length === 0) return null;

  return (
    <View style={platStyles.wrap}>
      {title ? (
        <Text style={[platStyles.subTitle, { color: theme.subtext }]}>{title}</Text>
      ) : null}
      <View style={[platStyles.stackedBar, { backgroundColor: theme.border }]}>
        {items.map((item) => (
          item.pct > 0 && (
            <View
              key={item.accountId}
              style={{ width: `${item.pct}%`, backgroundColor: item.color, height: '100%' }}
            />
          )
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

// ─── Period Preset Button ──────────────────────────────

function PresetBtn({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[pStyles.btn, { borderColor: theme.border },
        active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <Text style={[pStyles.label, { color: active ? '#fff' : theme.subtext }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const pStyles = StyleSheet.create({
  btn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  label: { fontSize: 13 },
});

// ─── Main Screen ──────────────────────────────────────

export function AnalyticsScreen() {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const { width: W } = useWindowDimensions();
  const chartWidth = W - 48;
  const {
    summary, platformShares, topCategories, chartBars, chartGranularity,
    filters, setFilters, compute, isLoading, homeCurrency, loadHomeCurrency,
  } = useAnalyticsStore();
  const { fetchRates } = useExchangeRatesStore();

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen,   setDateToOpen]   = useState(false);
  const [customFrom,   setCustomFrom]   = useState<Date | null>(null);
  const [customTo,     setCustomTo]     = useState<Date | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);

  useEffect(() => {
    if (filters.periodPreset === 'custom') {
      setCustomFrom(new Date(filters.dateFrom));
      setCustomTo(new Date(filters.dateTo));
    }
  }, [filters.periodPreset, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    loadHomeCurrency();
    fetchRates().then(() => compute(chartWidth));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeCurrency();
      compute(chartWidth);
    }, [chartWidth]),
  );

  useEffect(() => {
    compute(chartWidth);
  }, [chartWidth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadHomeCurrency();
    await fetchRates();
    compute(chartWidth);
    setRefreshing(false);
  }, [chartWidth]);

  const currSym = currencySymbol(homeCurrency);
  const currLabel = `${currSym} ${homeCurrency}`;

  const periodFooter = (filters.periodPreset === 'this_month' || filters.periodPreset === 'last_month')
    ? formatMonthYearLabel(
        new Date(filters.dateFrom).getMonth(),
        new Date(filters.dateFrom).getFullYear(),
        language,
      )
    : undefined;

  const excludeSelf = filters.excludeSelfTransfers !== false;

  const totals = summary.reduce(
    (acc, s) => ({
      income:  acc.income  + s.totalIncome,
      expense: acc.expense + s.totalExpense,
      fees:    acc.fees    + s.totalFees,
      net:     acc.net     + s.netResult,
    }),
    { income: 0, expense: 0, fees: 0, net: 0 }
  );

  const fmt = (v: number) => v.toLocaleString('uk-UA', { maximumFractionDigits: 0 });

  const kpiItems: KpiData[] = [
    {
      label: t.analyticsIncome,
      value: `${fmt(totals.income)} ${currSym}`,
      color: theme.income,
      icon:  'arrow-down-circle-outline',
    },
    {
      label: t.analyticsExpenses,
      value: `${fmt(totals.expense)} ${currSym}`,
      color: theme.expense,
      icon:  'arrow-up-circle-outline',
    },
    {
      label: t.analyticsFees,
      value: `${fmt(totals.fees)} ${currSym}`,
      color: theme.warning,
      icon:  'receipt-outline',
    },
    {
      label: t.analyticsResult,
      value: `${totals.net >= 0 ? '+' : ''}${fmt(totals.net)} ${currSym}`,
      color: totals.net >= 0 ? theme.income : theme.expense,
      icon:  totals.net >= 0 ? 'trending-up-outline' : 'trending-down-outline',
    },
  ];

  const PRESETS: { key: PeriodPreset; label: string }[] = [
    { key: 'this_month', label: t.analyticsThisMonth },
    { key: 'last_month', label: t.analyticsLastMonth },
    { key: 'this_year',  label: t.analyticsThisYear  },
    { key: 'last_year',  label: t.analyticsLastYear  },
    { key: 'all',        label: t.analyticsAll        },
    { key: 'custom',     label: t.analyticsCustom     },
  ];

  function openCustomRange() {
    if (filters.periodPreset === 'custom' && customFrom && customTo) {
      return;
    }
    setCustomFrom(null);
    setCustomTo(null);
    setDateFromOpen(true);
  }

  function clearCustomFilter() {
    setCustomFrom(null);
    setCustomTo(null);
    setFilters({ periodPreset: 'this_month' });
  }

  function applyCustomDates(from: Date, to: Date) {
    setCustomFrom(from);
    setCustomTo(to);
    setFilters({
      periodPreset: 'custom',
      dateFrom: from.getTime(),
      dateTo:   new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59).getTime(),
    });
  }

  function buildAccountShareItems(type: 'income' | 'expense'): PlatformShareItem[] {
    const shares = platformShares.filter((s) => s.type === type);
    const map = new Map<string, { accountId: string; accountName: string; total: number; color: string }>();
    for (const s of shares) {
      const existing = map.get(s.accountId);
      if (existing) {
        existing.total += s.platformTotal;
      } else {
        map.set(s.accountId, {
          accountId: s.accountId,
          accountName: s.accountName,
          total: s.platformTotal,
          color: s.color ?? PLATFORM_COLORS[s.platform] ?? theme.accent,
        });
      }
    }
    const items = [...map.values()].filter((p) => p.total > 0);
    const grand = items.reduce((sum, p) => sum + p.total, 0) || 1;
    return items
      .map((p) => ({
        accountId: p.accountId,
        accountName: p.accountName,
        total: p.total,
        pct: (p.total / grand) * 100,
        color: p.color,
      }))
      .sort((a, b) => b.total - a.total);
  }

  const expenseShareItems = buildAccountShareItems('expense');
  const incomeShareItems  = buildAccountShareItems('income');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >

        {/* Period presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsRow}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {PRESETS.map((p) => (
            <PresetBtn
              key={p.key}
              label={p.label}
              active={filters.periodPreset === p.key}
              onPress={() => {
                if (p.key === 'custom') {
                  if (filters.periodPreset === 'custom' && customFrom && customTo) {
                    setFilters({ periodPreset: 'custom' });
                  } else {
                    openCustomRange();
                  }
                } else {
                  setFilters({ periodPreset: p.key });
                }
              }}
            />
          ))}
        </ScrollView>

        {/* Custom date range display — edit button */}
        {filters.periodPreset === 'custom' && customFrom && customTo && (
          <View style={[styles.customRange, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => setDateFromOpen(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.customDateText, { color: theme.accent, fontWeight: '600' }]}>
                {customFrom.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.customDateSep, { color: theme.subtext }]}>→</Text>
            <TouchableOpacity
              onPress={() => setDateToOpen(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.customDateText, { color: theme.accent, fontWeight: '600' }]}>
                {customTo.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearCustomFilter}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={styles.clearFilterBtn}
            >
              <Text style={[styles.clearFilterText, { color: theme.expense }]}>{t.analyticsClearFilter}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Note: stats exclude self-transfers */}
        <View style={[styles.noteRow, cardSurface(), { borderColor: theme.border }]}>
          <Ionicons name="swap-horizontal-outline" size={15} color={theme.subtext} />
          <Text style={[styles.noteText, { color: theme.subtext, flex: 1 }]}>
            {excludeSelf ? t.analyticsExcludeSelfTransfers : t.analyticsIncludeSelfTransfers}
          </Text>
          <Switch
            value={excludeSelf}
            onValueChange={(v) => setFilters({ excludeSelfTransfers: v })}
            trackColor={{ false: theme.border, true: theme.accent + '88' }}
            thumbColor={excludeSelf ? theme.accent : theme.subtext}
          />
        </View>

        {/* KPI cards */}
        <KpiCards items={kpiItems} />

        {/* Chart section */}
        {chartBars.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext, marginBottom: 8 }]}>
              {t.analyticsIncomeAndExpense}
            </Text>
            <ChartLegend />
            <View style={[styles.chartCard, cardSurface(), { width: W - 32 }]}>
              <BarChart
                bars={chartBars}
                subTextColor={theme.subtext}
                width={chartWidth}
                granularity={chartGranularity}
                periodFooter={periodFooter}
              />
            </View>
          </View>
        )}

        {/* Statistics by cards */}
        {(expenseShareItems.length > 0 || incomeShareItems.length > 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.analyticsStatsByPlatform}</Text>
            {expenseShareItems.length > 0 && (
              <PlatformShareBar title={t.analyticsExpenses} items={expenseShareItems} />
            )}
            {incomeShareItems.length > 0 && (
              <PlatformShareBar title={t.analyticsIncome} items={incomeShareItems} />
            )}
          </View>
        )}

        {/* Top categories */}
        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.analyticsTopCategories}</Text>
            {topCategories.map((c, i) => (
              <View key={c.category} style={[styles.catRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.catRankBubble, { backgroundColor: theme.accent + '22' }]}>
                  <Text style={[styles.catRank, { color: theme.accent }]}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <CategoryRowName categoryKey={c.category} />
                  <Text style={[styles.catCount, { color: theme.subtext }]}>
                    {c.txCount} {t.analyticsTx}
                  </Text>
                </View>
                <Text style={[styles.catTotal, { color: theme.expense }]}>
                  {c.total.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} {currSym}
                </Text>
              </View>
            ))}
          </View>
        )}

        {summary.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>{t.analyticsNoData}</Text>
          </View>
        )}
      </ScrollView>

      {/* Date From picker */}
      <DatePickerModal
        visible={dateFromOpen}
        value={customFrom}
        title={t.txDateFrom}
        maxDate={customTo ?? new Date()}
        onClose={() => setDateFromOpen(false)}
        onConfirm={(d) => {
          setDateFromOpen(false);
          if (customTo && d > customTo) {
            setCustomFrom(d);
            setCustomTo(d);
            applyCustomDates(d, d);
          } else if (customTo) {
            setCustomFrom(d);
            applyCustomDates(d, customTo);
          } else {
            setCustomFrom(d);
            setDateToOpen(true);
          }
        }}
      />
      {/* Date To picker — validates From < To */}
      <DatePickerModal
        visible={dateToOpen}
        value={customTo}
        title={t.txDateTo}
        minDate={customFrom ?? undefined}
        onClose={() => setDateToOpen(false)}
        onConfirm={(d) => {
          setDateToOpen(false);
          const from = customFrom ?? d;
          if (from > d) {
            applyCustomDates(d, from);
          } else {
            applyCustomDates(from, d);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  presetsRow:   { flexGrow: 0, marginVertical: 12 },
  section:      { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  chartCard: {
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, overflow: 'hidden',
  },
  customRange: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, gap: 6,
  },
  customDateText:    { fontSize: 12 },
  customDateSep:     { fontSize: 12 },
  clearFilterBtn:    { marginLeft: 'auto', paddingHorizontal: 4 },
  clearFilterText:   { fontSize: 11, fontWeight: '700' },
  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  noteText: { fontSize: 11, flex: 1 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  catRankBubble: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catRank:  { fontSize: 12, fontWeight: '700' },
  catName:  { fontSize: 14 },
  catCount: { fontSize: 12 },
  catTotal: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:  { fontSize: 15 },
});
