import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TextInput, TouchableOpacity, LayoutAnimation,
  Platform, UIManager, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionsStore } from '../../store/transactionsSlice';
import { useAccountsStore }      from '../../store/accountsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { TransactionListItem } from '../../components/TransactionListItem';
import { DateSeparator } from '../../components/DateSeparator';
import { TxDetailModal } from '../../components/TxDetailModal';
import { useCategoryLabels } from '../../hooks/useCategoryLabels';
import type { UnifiedTransaction, TransactionType } from '../../types';
import { dateFnsLocale } from '../../utils/locale';
import { layout, radius, space } from '../../theme/tokens';
import { format } from 'date-fns';
import type { FilterPlatform } from './types';
import { FilterBar } from './FilterBar';
import { FilterModal } from './FilterModal';
import { refreshAppData } from '../../services/refreshAppData';

type DisplayItem =
  | { kind: 'sep'; label: string; key: string }
  | { kind: 'tx'; data: UnifiedTransaction };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TransactionsScreen() {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const dateLoc = dateFnsLocale(language);
  const {
    transactions, totalCount, hasMore,
    loadTransactions, loadMoreTransactions, dataVersion,
  } = useTransactionsStore();
  const { accounts, loadAccounts } = useAccountsStore();
  const categoryLabels = useCategoryLabels();
  const [refreshing, setRefreshing] = useState(false);

  const [search,        setSearch]        = useState('');
  const [selPlatforms,  setSelPlatforms]  = useState<FilterPlatform[]>([]);
  const [selTypes,      setSelTypes]      = useState<TransactionType[]>([]);
  const [selAccountId,  setSelAccountId]  = useState<string | null>(null);
  const [dateFrom,      setDateFrom]      = useState<Date | null>(null);
  const [dateTo,        setDateTo]        = useState<Date | null>(null);
  const [selCurrencies, setSelCurrencies] = useState<string[]>([]);
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [detailTx,      setDetailTx]      = useState<UnifiedTransaction | null>(null);

  const platformLabels: Record<FilterPlatform, string> = {
    monobank: t.platformMonobank, ibkr: t.platformIbkr,
    privatbank: t.platformPrivatbank, zen: t.platformZen,
  };
  const typeLabels: Record<TransactionType, string> = {
    income: t.typeIncome, expense: t.typeExpense, transfer: t.typeTransfer, fee: t.typeFee,
  };

  const buildFilter = useCallback(() => ({
    platforms:   selPlatforms.length > 0 ? selPlatforms : undefined,
    types:       selTypes.length > 0 ? selTypes : undefined,
    accountId:   selAccountId ?? undefined,
    searchText:  search || undefined,
    dateFrom:    dateFrom ? dateFrom.getTime() : undefined,
    dateTo:      dateTo   ? dateTo.getTime()   : undefined,
    currencies:  selCurrencies.length > 0 ? selCurrencies : undefined,
    tags:        selCategories.length > 0 ? selCategories : undefined,
  }), [search, selPlatforms, selTypes, selAccountId, dateFrom, dateTo, selCurrencies, selCategories]);

  useEffect(() => {
    loadTransactions();
    loadAccounts();
  }, []);

  useEffect(() => {
    setSelAccountId(null);
  }, [selPlatforms]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions(buildFilter());
    }, [buildFilter]),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      loadTransactions(buildFilter());
    }, 350);
    return () => clearTimeout(timer);
  }, [buildFilter]);

  function applyFilters() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    loadTransactions(buildFilter());
  }

  function resetFilters() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelPlatforms([]); setSelTypes([]); setSelAccountId(null);
    setDateFrom(null); setDateTo(null);
    setSelCurrencies([]); setSelCategories([]);
  }

  const activeFilters = selPlatforms.length
    + (selAccountId ? 1 : 0)
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
    + selCurrencies.length + selCategories.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAppData('all');
    loadTransactions(buildFilter());
    setRefreshing(false);
  }, [buildFilter, loadTransactions]);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const displayItems = useMemo(() => {
    const items: DisplayItem[] = [];
    let lastDate = '';
    for (const tx of transactions) {
      const label = format(tx.transactionDate, 'd MMMM yyyy', { locale: dateLoc });
      if (label !== lastDate) {
        items.push({ kind: 'sep', label, key: `sep_${label}` });
        lastDate = label;
      }
      items.push({ kind: 'tx', data: tx });
    }
    return items;
  }, [transactions, dateLoc]);

  const renderItem = useCallback(({ item }: { item: DisplayItem }) => {
    if (item.kind === 'sep') return <DateSeparator label={item.label} />;
    const acc = accountMap.get(item.data.accountId);
    const col = acc?.color ?? theme.accent;
    const name = acc ? (acc.displayName ?? acc.name) : item.data.platform;
    return (
      <TransactionListItem
        item={item.data}
        categoryLabels={categoryLabels}
        accountColor={col}
        accountName={name}
        onPress={() => setDetailTx(item.data)}
      />
    );
  }, [accountMap, categoryLabels, theme.accent]);

  const keyExtractor = useCallback(
    (item: DisplayItem) => (item.kind === 'sep' ? item.key : item.data.id),
    [],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <View style={styles.topRow}>
        <View style={[styles.searchBox, cardSurface()]}>
          <Ionicons name="search-outline" size={18} color={theme.subtext} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t.txSearch}
            placeholderTextColor={theme.subtext}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.75}>
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, {
            backgroundColor: activeFilters > 0 ? theme.accent : cardSurface().backgroundColor,
            borderColor: theme.border,
            borderWidth: activeFilters > 0 ? 0 : 1,
          }]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilters > 0 ? theme.onAccent : theme.subtext}
          />
          {activeFilters > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.onAccent }]}>
              <Text style={[styles.filterBadgeText, { color: theme.accent }]}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FilterBar
        selPlatforms={selPlatforms}
        setSelPlatforms={setSelPlatforms}
        selTypes={selTypes}
        setSelTypes={setSelTypes}
        selAccountId={selAccountId}
        setSelAccountId={setSelAccountId}
        accounts={accounts}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        selCurrencies={selCurrencies}
        setSelCurrencies={setSelCurrencies}
        selCategories={selCategories}
        setSelCategories={setSelCategories}
        platformLabels={platformLabels}
        typeLabels={typeLabels}
        categoryLabels={categoryLabels}
        onOpenFilters={() => setFilterVisible(true)}
      />

      <Text style={[styles.countText, { color: theme.subtext }]}>
        {transactions.length}{totalCount > transactions.length ? ` / ${totalCount}` : ''} {t.txCount}
      </Text>

      <FlatList
        data={displayItems}
        keyExtractor={keyExtractor}
        extraData={`${dataVersion}_${categoryLabels}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        onEndReached={() => { if (hasMore) loadMoreTransactions(); }}
        onEndReachedThreshold={0.4}
        renderItem={renderItem}
        initialNumToRender={18}
        maxToRenderPerBatch={24}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.subtext }]}>{t.txNoResults}</Text>
        }
        contentContainerStyle={{ paddingHorizontal: layout.screenPad, paddingBottom: layout.listBottom }}
      />

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selPlatforms={selPlatforms}
        setSelPlatforms={setSelPlatforms}
        selTypes={selTypes}
        setSelTypes={setSelTypes}
        selAccountId={selAccountId}
        setSelAccountId={setSelAccountId}
        accounts={accounts}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        selCurrencies={selCurrencies}
        setSelCurrencies={setSelCurrencies}
        selCategories={selCategories}
        setSelCategories={setSelCategories}
        onApply={applyFilters}
        onReset={resetFilters}
        platformLabels={platformLabels}
        typeLabels={typeLabels}
        categoryLabels={categoryLabels}
      />

      {/* Transaction detail modal */}
      <TxDetailModal
        item={detailTx}
        visible={!!detailTx}
        onClose={() => setDetailTx(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: layout.screenPad, paddingVertical: space[2.5], gap: space[2.5],
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, paddingHorizontal: space[3], paddingVertical: space[2.5], gap: space[2],
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterBtn: {
    width: 44, height: 44, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    borderRadius: radius.xs, width: 14, height: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800' },
  countText: { fontSize: 12, marginLeft: layout.screenPad, marginBottom: 6 },
  emptyText: { textAlign: 'center', paddingVertical: 40 },
});
