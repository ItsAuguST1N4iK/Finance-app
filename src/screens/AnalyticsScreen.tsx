import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Text as SvgText, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAnalyticsStore, ChartBar } from '../store/analyticsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DatePickerModal } from '../components/DatePickerModal';
import type { AnalyticsFilters } from '../types';

type PeriodPreset = NonNullable<AnalyticsFilters['periodPreset']>;

// ─── KPI Cards ───────────────────────────────────────

interface KpiData {
  label: string;
  value: string;
  color: string;
  icon: string;
  sub?: string;
}

function KpiCards({ items }: { items: KpiData[] }) {
  const { theme } = useTheme();
  return (
    <View style={kpiStyles.row}>
      {items.map((item, idx) => (
        <View
          key={idx}
          style={[kpiStyles.card, {
            backgroundColor: theme.card,
            borderLeftColor: item.color,
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
  card: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 14, borderLeftWidth: 3 },
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

function BarChart({ bars, subTextColor, width }: {
  bars: ChartBar[];
  subTextColor: string;
  width: number;
}) {
  const { theme } = useTheme();
  if (bars.length === 0) return null;

  const height = 200;
  const padL   = 8;
  const padR   = 8;
  const padT   = 24;
  const padB   = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(...bars.map((b) => Math.max(b.income, b.expense)), 1);

  // Draw horizontal guide lines
  const guideLines = [0.25, 0.5, 0.75, 1.0].map((frac) => ({
    y: padT + chartH - frac * chartH,
    val: (maxVal * frac),
  }));

  const showEvery = bars.length > 20 ? Math.ceil(bars.length / 12) : 1;
  const groupW    = chartW / bars.length;
  const gap       = Math.max(1, groupW * 0.08);
  const barW      = Math.max(2, Math.floor((groupW - gap) / 2) - 1);

  // Build smooth bezier paths
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

  // Area fill paths (close down to baseline)
  const baseline = padT + chartH;
  const incomeAreaPath  = incomePath  + ` L ${incomePts[incomePts.length - 1].x},${baseline} L ${incomePts[0].x},${baseline} Z`;
  const expenseAreaPath = expensePath + ` L ${expensePts[expensePts.length - 1].x},${baseline} L ${expensePts[0].x},${baseline} Z`;

  return (
    <Svg width={width} height={height}>
      {/* Guide lines */}
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

      {/* Area fills */}
      <Path d={incomeAreaPath}  fill={theme.income}  opacity={0.08} />
      <Path d={expenseAreaPath} fill={theme.expense} opacity={0.08} />

      {/* Bars */}
      {bars.map((bar, i) => {
        const groupX    = padL + i * groupW;
        const incomeH   = Math.max(2, (bar.income / maxVal) * chartH);
        const expenseH  = Math.max(2, (bar.expense / maxVal) * chartH);
        const centerX   = groupX + (groupW - barW * 2 - gap) / 2;
        const incomeX   = centerX;
        const expenseX  = centerX + barW + gap;
        const showLabel = i % showEvery === 0;

        return (
          <React.Fragment key={i}>
            <Rect
              x={incomeX}
              y={padT + chartH - incomeH}
              width={barW}
              height={incomeH}
              rx={Math.min(barW / 2, 3)}
              fill={theme.income}
              opacity={0.65}
            />
            <Rect
              x={expenseX}
              y={padT + chartH - expenseH}
              width={barW}
              height={expenseH}
              rx={Math.min(barW / 2, 3)}
              fill={theme.expense}
              opacity={0.65}
            />
            {showLabel && (
              <SvgText
                x={groupX + groupW / 2}
                y={height - 6}
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

      {/* Smooth trend lines */}
      <Path d={incomePath}  fill="none" stroke={theme.income}  strokeWidth={2} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={expensePath} fill="none" stroke={theme.expense} strokeWidth={2} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots on trend lines */}
      {incomePts.filter((_, i) => i % showEvery === 0).map((pt, i) => (
        <React.Fragment key={`id${i}`}>
          <Line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y} stroke={theme.income} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
        </React.Fragment>
      ))}
      {expensePts.filter((_, i) => i % showEvery === 0).map((pt, i) => (
        <React.Fragment key={`ed${i}`}>
          <Line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y} stroke={theme.expense} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
        </React.Fragment>
      ))}

      {/* Baseline */}
      <Line
        x1={padL} y1={padT + chartH}
        x2={width - padR} y2={padT + chartH}
        stroke={subTextColor} strokeWidth={0.6} opacity={0.4}
      />
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

// ─── Combined Platform Row ─────────────────────────────

interface PlatformData {
  platform: string;
  incomeTotal: number;
  expenseTotal: number;
  incomePct: number;
  expensePct: number;
}

function CombinedPlatformRow({ data }: { data: PlatformData }) {
  const { theme } = useTheme();
  const fmt       = (v: number) => v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString('uk-UA', { maximumFractionDigits: 0 });

  return (
    <View style={platStyles.row}>
      <Text style={[platStyles.name, { color: theme.text }]}>{data.platform.toUpperCase()}</Text>
      <View style={platStyles.barsCol}>
        {/* Income bar */}
        <View style={platStyles.barRow}>
          <View style={[platStyles.barBg, { backgroundColor: theme.border }]}>
            <View style={[platStyles.barFill, {
              width: `${Math.min(data.incomePct, 100)}%`,
              backgroundColor: theme.income,
            }]} />
          </View>
          <Text style={[platStyles.amount, { color: theme.income }]}>{fmt(data.incomeTotal)}</Text>
        </View>
        {/* Expense bar */}
        <View style={platStyles.barRow}>
          <View style={[platStyles.barBg, { backgroundColor: theme.border }]}>
            <View style={[platStyles.barFill, {
              width: `${Math.min(data.expensePct, 100)}%`,
              backgroundColor: theme.expense,
            }]} />
          </View>
          <Text style={[platStyles.amount, { color: theme.expense }]}>{fmt(data.expenseTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const platStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  name:    { fontSize: 12, fontWeight: '600', width: 70 },
  barsCol: { flex: 1, gap: 4 },
  barRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barBg:   { flex: 1, height: 6, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  amount:  { fontSize: 11, minWidth: 42, textAlign: 'right', fontWeight: '600' },
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
  const { theme }    = useTheme();
  const { t }        = useLanguage();
  const { width: W } = useWindowDimensions();
  const {
    summary, platformShares, topCategories, chartBars,
    filters, setFilters, compute, isLoading,
  } = useAnalyticsStore();

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen,   setDateToOpen]   = useState(false);
  const [customFrom,   setCustomFrom]   = useState<Date | null>(null);
  const [customTo,     setCustomTo]     = useState<Date | null>(null);

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

  const fmt = (v: number) => v.toLocaleString('uk-UA', { maximumFractionDigits: 0 });

  const kpiItems: KpiData[] = [
    {
      label: t.analyticsIncome,
      value: `${fmt(totals.income)} ₴`,
      color: theme.income,
      icon:  'arrow-down-circle-outline',
    },
    {
      label: t.analyticsExpenses,
      value: `${fmt(totals.expense)} ₴`,
      color: theme.expense,
      icon:  'arrow-up-circle-outline',
    },
    {
      label: t.analyticsFees,
      value: `${fmt(totals.fees)} ₴`,
      color: theme.warning,
      icon:  'receipt-outline',
    },
    {
      label: t.analyticsResult,
      value: `${totals.net >= 0 ? '+' : ''}${fmt(totals.net)} ₴`,
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

  const isYearView = filters.periodPreset === 'this_year' || filters.periodPreset === 'last_year';

  function applyCustomDates() {
    if (customFrom && customTo) {
      setFilters({
        periodPreset: 'custom',
        dateFrom: customFrom.getTime(),
        dateTo:   new Date(customTo.getFullYear(), customTo.getMonth(), customTo.getDate(), 23, 59, 59).getTime(),
      });
    }
  }

  // Group platformShares by platform
  const allPlatforms = [...new Set(platformShares.map((s) => s.platform))];
  const totalIncome  = platformShares.filter((s) => s.type === 'income').reduce((a, s) => a + s.platformTotal, 0) || 1;
  const totalExpense = platformShares.filter((s) => s.type === 'expense').reduce((a, s) => a + s.platformTotal, 0) || 1;

  const groupedPlatforms: PlatformData[] = allPlatforms.map((platform) => {
    const inc = platformShares.find((s) => s.platform === platform && s.type === 'income');
    const exp = platformShares.find((s) => s.platform === platform && s.type === 'expense');
    return {
      platform,
      incomeTotal:  inc?.platformTotal ?? 0,
      expenseTotal: exp?.platformTotal ?? 0,
      incomePct:    ((inc?.platformTotal ?? 0) / totalIncome) * 100,
      expensePct:   ((exp?.platformTotal ?? 0) / totalExpense) * 100,
    };
  }).filter((p) => p.incomeTotal > 0 || p.expenseTotal > 0);

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
          {PRESETS.map((p) => (
            <PresetBtn
              key={p.key}
              label={p.label}
              active={filters.periodPreset === p.key}
              onPress={() => {
                if (p.key === 'custom') {
                  setDateFromOpen(true);
                } else {
                  setFilters({ periodPreset: p.key });
                }
              }}
            />
          ))}
        </ScrollView>

        {/* Custom date range display */}
        {filters.periodPreset === 'custom' && (
          <View style={[styles.customRange, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.customDateBtn} onPress={() => setDateFromOpen(true)} activeOpacity={0.75}>
              <Ionicons name="calendar-outline" size={14} color={theme.accent} />
              <Text style={[styles.customDateText, { color: theme.text }]}>
                {customFrom ? customFrom.toLocaleDateString('uk-UA') : t.txDateFrom}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.customSep, { color: theme.subtext }]}>→</Text>
            <TouchableOpacity style={styles.customDateBtn} onPress={() => setDateToOpen(true)} activeOpacity={0.75}>
              <Ionicons name="calendar-outline" size={14} color={theme.accent} />
              <Text style={[styles.customDateText, { color: theme.text }]}>
                {customTo ? customTo.toLocaleDateString('uk-UA') : t.txDateTo}
              </Text>
            </TouchableOpacity>
            {customFrom && customTo && (
              <TouchableOpacity
                style={[styles.applyRangeBtn, { backgroundColor: theme.accent }]}
                onPress={applyCustomDates}
                activeOpacity={0.75}
              >
                <Text style={styles.applyRangeBtnText}>{t.apply}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* KPI cards */}
        <KpiCards items={kpiItems} />

        {/* Chart section */}
        {chartBars.length > 0 && (
          <View style={styles.section}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { color: theme.subtext }]}>
                {t.analyticsIncomeAndExpense}
              </Text>
              {/* Daily / Monthly toggle for year view */}
              {isYearView && (
                <View style={[styles.togglePill, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, filters.chartMode !== 'daily' && { backgroundColor: theme.accent + 'cc' }]}
                    onPress={() => setFilters({ chartMode: 'monthly' })}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.toggleBtnText, { color: filters.chartMode !== 'daily' ? '#fff' : theme.subtext }]}>
                      {t.analyticsMonthly}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, filters.chartMode === 'daily' && { backgroundColor: theme.accent + 'cc' }]}
                    onPress={() => setFilters({ chartMode: 'daily' })}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.toggleBtnText, { color: filters.chartMode === 'daily' ? '#fff' : theme.subtext }]}>
                      {t.analyticsDaily}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <ChartLegend />
            <View style={[styles.chartCard, { backgroundColor: theme.card, width: W - 32 }]}>
              <BarChart
                bars={chartBars}
                subTextColor={theme.subtext}
                width={W - 48}
              />
            </View>
          </View>
        )}

        {/* Combined Platform Statistics */}
        {groupedPlatforms.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.analyticsStatsByPlatform}</Text>
            {groupedPlatforms.map((p) => (
              <CombinedPlatformRow key={p.platform} data={p} />
            ))}
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
                  <Text style={[styles.catName, { color: theme.text }]}>{c.category}</Text>
                  <Text style={[styles.catCount, { color: theme.subtext }]}>
                    {c.txCount} {t.analyticsTx}
                  </Text>
                </View>
                <Text style={[styles.catTotal, { color: theme.expense }]}>
                  {c.total.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
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

      {/* Custom date pickers */}
      <DatePickerModal
        visible={dateFromOpen}
        value={customFrom}
        title={t.txDateFrom}
        onClose={() => setDateFromOpen(false)}
        onConfirm={(d) => {
          setCustomFrom(d);
          setDateFromOpen(false);
          if (!customTo) setDateToOpen(true);
        }}
      />
      <DatePickerModal
        visible={dateToOpen}
        value={customTo}
        title={t.txDateTo}
        onClose={() => setDateToOpen(false)}
        onConfirm={(d) => {
          setCustomTo(d);
          setDateToOpen(false);
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
  togglePill: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  toggleBtn:  { paddingHorizontal: 10, paddingVertical: 5 },
  toggleBtnText: { fontSize: 11, fontWeight: '600' },
  chartCard: {
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, overflow: 'hidden',
  },
  customRange: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    padding: 10, borderRadius: 14, borderWidth: 1, gap: 8,
  },
  customDateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  customDateText:     { fontSize: 13 },
  customSep:          { fontSize: 16 },
  applyRangeBtn:      { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  applyRangeBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  catRankBubble: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catRank:  { fontSize: 12, fontWeight: '700' },
  catName:  { fontSize: 14 },
  catCount: { fontSize: 12 },
  catTotal: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:  { fontSize: 15 },
});
