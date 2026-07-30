import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, useWindowDimensions, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAnalyticsStore } from '../../store/analyticsSlice';
import { formatMonthYearLabel } from '../../utils/chartLabels';
import { useExchangeRatesStore } from '../../store/exchangeRatesSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { DatePickerModal } from '../../components/DatePickerModal';
import { currencySymbol } from '../../utils/currency';
import { numberLocale } from '../../utils/locale';
import { sectionLabelStyle } from '../../theme/commonStyles';
import { layout, radius, space } from '../../theme/tokens';
import type { AnalyticsFilters } from '../../types';
import { storedCategoryKey } from '../../utils/categories';
import { CategoryRowName } from './CategoryRowName';
import { KpiCards, type KpiData } from './KpiCards';
import { BarChart, ChartLegend } from './BarChart';
import { PlatformShareBar, PLATFORM_COLORS, type PlatformShareItem } from './PlatformShareBar';
import { PeriodChip } from './PeriodChip';
import { IbkrHoldingsSection } from './IbkrHoldingsSection';
import { CategoryDrillSheet } from './CategoryDrillSheet';
import { useCategoryLabel } from '../../hooks/useCategoryLabels';
import { getCategoryColor } from '../../utils/categoryImpact';

type PeriodPreset = NonNullable<AnalyticsFilters['periodPreset']>;

export function AnalyticsScreen() {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const { width: W } = useWindowDimensions();
  const chartWidth = W - 48;
  const {
    summary, platformShares, topCategories, chartBars, chartGranularity,
    filters, setFilters, compute, isLoading, homeCurrency, loadHomeCurrency,
    investmentTotal, investmentTxCount, ibkrHoldings, ibkrMarketValue,
    periodTxs,
  } = useAnalyticsStore();
  const { fetchRates } = useExchangeRatesStore();

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen,   setDateToOpen]   = useState(false);
  const [customFrom,   setCustomFrom]   = useState<Date | null>(null);
  const [customTo,     setCustomTo]     = useState<Date | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedLabel = useCategoryLabel(selectedCategory);

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
      // Soft refresh only — avoid re-running heavy compute on every tab focus
      loadHomeCurrency();
    }, []),
  );

  useEffect(() => {
    // Width changes rarely; skip duplicate compute on first mount (handled above)
  }, [chartWidth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadHomeCurrency();
    await fetchRates();
    compute(chartWidth);
    setRefreshing(false);
  }, [chartWidth, loadHomeCurrency, fetchRates, compute]);

  const currSym = currencySymbol(homeCurrency);
  const loc = numberLocale(language);

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

  const fmt = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 0 });

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
      sub:   t.analyticsResultHint,
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

  const categoryTxs = useMemo(() => {
    if (!selectedCategory) return [];
    return periodTxs
      .filter((tx) => storedCategoryKey(tx) === selectedCategory)
      .sort((a, b) => b.transaction_date - a.transaction_date);
  }, [selectedCategory, periodTxs]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsRow}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {PRESETS.map((p) => (
            <PeriodChip
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

        {filters.periodPreset === 'custom' && customFrom && customTo && (
          <View style={[styles.customRange, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={() => setDateFromOpen(true)} activeOpacity={0.75}>
              <Text style={[styles.customDateText, { color: theme.accent, fontWeight: '600' }]}>
                {customFrom.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.customDateSep, { color: theme.subtext }]}>→</Text>
            <TouchableOpacity onPress={() => setDateToOpen(true)} activeOpacity={0.75}>
              <Text style={[styles.customDateText, { color: theme.accent, fontWeight: '600' }]}>
                {customTo.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearCustomFilter} style={styles.clearFilterBtn}>
              <Text style={[styles.clearFilterText, { color: theme.expense }]}>{t.analyticsClearFilter}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.noteRow, cardSurface(), { borderColor: theme.border }]}>
          <Ionicons name="swap-horizontal-outline" size={15} color={theme.subtext} />
          <Text style={[styles.noteText, { color: theme.subtext, flex: 1 }]}>
            {t.analyticsIncludeSelfTransfers}
          </Text>
          <Switch
            value={!excludeSelf}
            onValueChange={(include) => setFilters({ excludeSelfTransfers: !include })}
            trackColor={{ false: theme.border, true: theme.accent + '88' }}
            thumbColor={!excludeSelf ? theme.accent : theme.subtext}
          />
        </View>

        <KpiCards items={kpiItems} />

        {chartBars.length > 0 && (
          <View style={styles.section}>
            <Text style={sectionLabelStyle(theme.subtext, space[2])}>
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

        {(expenseShareItems.length > 0 || incomeShareItems.length > 0) && (
          <View style={styles.section}>
            <Text style={sectionLabelStyle(theme.subtext)}>{t.analyticsStatsByPlatform}</Text>
            {expenseShareItems.length > 0 && (
              <PlatformShareBar title={t.analyticsExpenses} items={expenseShareItems} />
            )}
            {incomeShareItems.length > 0 && (
              <PlatformShareBar title={t.analyticsIncome} items={incomeShareItems} />
            )}
          </View>
        )}

        <IbkrHoldingsSection
          holdings={ibkrHoldings}
          investedTotal={investmentTotal}
          marketValue={ibkrMarketValue}
          buyCount={investmentTxCount}
          homeCurrency={homeCurrency}
        />

        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={sectionLabelStyle(theme.subtext)}>{t.analyticsTopCategories}</Text>
            {topCategories.map((c, i) => {
              const catColor = getCategoryColor(c.category);
              return (
                <TouchableOpacity
                  key={c.category}
                  style={[styles.catRow, { borderBottomColor: theme.border }]}
                  onPress={() => setSelectedCategory(c.category)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catRankBubble, { backgroundColor: catColor + '33' }]}>
                    <Text style={[styles.catRank, { color: catColor }]}>#{i + 1}</Text>
                  </View>
                  <View style={[styles.catColorDot, { backgroundColor: catColor }]} />
                  <View style={{ flex: 1 }}>
                    <CategoryRowName categoryKey={c.category} />
                    <Text style={[styles.catCount, { color: theme.subtext }]}>
                      {c.txCount} {t.analyticsTx}
                    </Text>
                  </View>
                  <Text style={[styles.catTotal, { color: theme.expense }]}>
                    {c.total.toLocaleString(loc, { maximumFractionDigits: 0 })} {currSym}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {summary.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>{t.analyticsNoData}</Text>
          </View>
        )}
      </ScrollView>

      <CategoryDrillSheet
        visible={!!selectedCategory}
        categoryKey={selectedCategory}
        categoryLabel={selectedLabel}
        txs={categoryTxs}
        homeCurrency={homeCurrency}
        onClose={() => setSelectedCategory(null)}
      />

      <DatePickerModal
        visible={dateFromOpen}
        value={customFrom}
        title={t.txDateFrom}
        maxDate={customTo ?? new Date()}
        rangeFrom={null}
        rangeTo={customTo}
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
      <DatePickerModal
        visible={dateToOpen}
        value={customTo}
        title={t.txDateTo}
        minDate={customFrom ?? undefined}
        rangeFrom={customFrom}
        rangeTo={null}
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
  container: { flex: 1 },
  presetsRow: { flexGrow: 0, marginVertical: space[3] },
  section: { paddingHorizontal: layout.screenPad, marginBottom: space[5] },
  chartCard: {
    borderRadius: radius.lg, paddingVertical: space[3], paddingHorizontal: space[2], overflow: 'hidden',
  },
  customRange: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: layout.screenPad, marginBottom: space[2.5],
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderRadius: radius.md, borderWidth: 1, gap: 6,
  },
  customDateText: { fontSize: 12 },
  customDateSep: { fontSize: 12 },
  clearFilterBtn: { marginLeft: 'auto', paddingHorizontal: 4 },
  clearFilterText: { fontSize: 11, fontWeight: '700' },
  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: layout.screenPad, marginBottom: space[2.5],
    paddingHorizontal: space[2.5], paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1,
  },
  noteText: { fontSize: 11, flex: 1 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[2.5], borderBottomWidth: 1, gap: space[2] },
  catRankBubble: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catColorDot: { width: 10, height: 10, borderRadius: 5 },
  catRank: { fontSize: 12, fontWeight: '700' },
  catCount: { fontSize: 12 },
  catTotal: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: space[3] },
  emptyText: { fontSize: 15 },
});
