import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TextInput, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useTheme } from '../theme/ThemeContext';
import type { UnifiedTransaction, Platform, TransactionType } from '../types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const PLATFORMS: Platform[]        = ['monobank', 'ibkr', 'privatbank', 'zen', 'manual'];
const TYPES: TransactionType[]     = ['income', 'expense', 'transfer', 'fee'];

const PLATFORM_LABELS: Record<Platform, string> = {
  monobank: 'Monobank', ibkr: 'Interactive Brokers',
  privatbank: 'PrivatBank', zen: 'Zen', manual: 'Вручну',
};
const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Дохід', expense: 'Витрата', transfer: 'Переказ', fee: 'Комісія',
};

// ─── Transaction Row ─────────────────────────────

function TxItem({ item }: { item: UnifiedTransaction }) {
  const { theme } = useTheme();
  const sign     = item.type === 'income' ? '+' : item.type === 'expense' ? '−' : '';
  const amtColor = item.type === 'income' ? theme.income : item.type === 'expense' ? theme.expense : theme.subtext;

  return (
    <View style={[styles.txItem, { borderBottomColor: theme.border }]}>
      <View style={styles.txLeft}>
        <Text style={[styles.txDesc, { color: theme.text }]} numberOfLines={1}>
          {item.description ?? item.category ?? 'Транзакція'}
        </Text>
        <View style={styles.txMeta}>
          <Text style={[styles.txPlatform, { color: theme.accent }]}>
            {PLATFORM_LABELS[item.platform]}
          </Text>
          <Text style={[styles.txDot, { color: theme.subtext }]}> · </Text>
          <Text style={[styles.txDate, { color: theme.subtext }]}>
            {format(item.transactionDate, 'd MMM yyyy', { locale: uk })}
          </Text>
          {item.feeAmount > 0 && (
            <>
              <Text style={[styles.txDot, { color: theme.subtext }]}> · </Text>
              <Text style={[styles.txFee, { color: theme.warning }]}>
                комісія {item.feeAmount.toLocaleString('uk-UA')} {item.feeCurrency ?? item.currency}
              </Text>
            </>
          )}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: amtColor }]}>
        {sign}{Math.abs(item.amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}{'\n'}
        <Text style={[styles.txCurrency, { color: theme.subtext }]}>{item.currency}</Text>
      </Text>
    </View>
  );
}

// ─── Filter Dropdown Modal ────────────────────────

function FilterModal({
  visible,
  onClose,
  selPlatforms,
  setSelPlatforms,
  selTypes,
  setSelTypes,
  onApply,
  onReset,
}: {
  visible:         boolean;
  onClose:         () => void;
  selPlatforms:    Platform[];
  setSelPlatforms: (p: Platform[]) => void;
  selTypes:        TransactionType[];
  setSelTypes:     (t: TransactionType[]) => void;
  onApply:         () => void;
  onReset:         () => void;
}) {
  const { theme } = useTheme();

  function togglePlatform(p: Platform) {
    setSelPlatforms(
      selPlatforms.includes(p)
        ? selPlatforms.filter((x) => x !== p)
        : [...selPlatforms, p]
    );
  }
  function toggleType(t: TransactionType) {
    setSelTypes(
      selTypes.includes(t)
        ? selTypes.filter((x) => x !== t)
        : [...selTypes, t]
    );
  }

  const activeCount = selPlatforms.length + selTypes.length;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={[fStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[fStyles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>

          <View style={fStyles.header}>
            <Text style={[fStyles.title, { color: theme.text }]}>Фільтри</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Platforms */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext }]}>Платформи</Text>
            {PLATFORMS.map((p) => {
              const active = selPlatforms.includes(p);
              return (
                <TouchableOpacity
                  key={p}
                  style={[fStyles.row, { borderColor: theme.border }]}
                  onPress={() => togglePlatform(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[fStyles.rowLabel, { color: active ? theme.accent : theme.text }]}>
                    {PLATFORM_LABELS[p]}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}

            {/* Types */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>Тип транзакції</Text>
            {TYPES.map((t) => {
              const active = selTypes.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[fStyles.row, { borderColor: theme.border }]}
                  onPress={() => toggleType(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[fStyles.rowLabel, { color: active ? theme.accent : theme.text }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={fStyles.footer}>
            <TouchableOpacity
              style={[fStyles.resetBtn, { borderColor: theme.border }]}
              onPress={onReset}
            >
              <Text style={[fStyles.resetBtnText, { color: theme.subtext }]}>Скинути</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[fStyles.applyBtn, { backgroundColor: theme.accent }]}
              onPress={() => { onApply(); onClose(); }}
            >
              <Text style={fStyles.applyBtnText}>
                Застосувати{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fStyles = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, padding: 20, maxHeight: '80%',
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:      { fontSize: 18, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1,
  },
  rowLabel:   { fontSize: 15 },
  footer:     { flexDirection: 'row', gap: 10, marginTop: 20 },
  resetBtn:   { flex: 1, borderRadius: 10, borderWidth: 1, padding: 13, alignItems: 'center' },
  resetBtnText: { fontSize: 15, fontWeight: '600' },
  applyBtn:   { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Main Screen ─────────────────────────────────

export function TransactionsScreen() {
  const { theme } = useTheme();
  const { transactions, loadTransactions } = useTransactionsStore();

  const [search,        setSearch]        = useState('');
  const [selPlatforms,  setSelPlatforms]  = useState<Platform[]>([]);
  const [selTypes,      setSelTypes]      = useState<TransactionType[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => { loadTransactions(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions({
        platforms:  selPlatforms,
        types:      selTypes,
        searchText: search || undefined,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, selPlatforms, selTypes]);

  function applyFilters() {
    loadTransactions({ platforms: selPlatforms, types: selTypes, searchText: search || undefined });
  }

  function resetFilters() {
    setSelPlatforms([]);
    setSelTypes([]);
  }

  const activeFilters = selPlatforms.length + selTypes.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      {/* Search + Filter row */}
      <View style={styles.topRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.card }]}>
          <Ionicons name="search-outline" size={18} color={theme.subtext} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Пошук за описом..."
            placeholderTextColor={theme.subtext}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          style={[styles.filterBtn,
            { backgroundColor: activeFilters > 0 ? theme.accent : theme.card }]}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="options-outline" size={20} color={activeFilters > 0 ? '#fff' : theme.subtext} />
          {activeFilters > 0 && (
            <Text style={styles.filterBadge}>{activeFilters}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips (compact row) */}
      {activeFilters > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        >
          {selPlatforms.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.activeChip, { backgroundColor: theme.accent + '28', borderColor: theme.accent }]}
              onPress={() => setSelPlatforms((prev) => prev.filter((x) => x !== p))}
            >
              <Text style={[styles.activeChipText, { color: theme.accent }]}>{PLATFORM_LABELS[p]}</Text>
              <Ionicons name="close" size={12} color={theme.accent} />
            </TouchableOpacity>
          ))}
          {selTypes.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.activeChip, { backgroundColor: theme.accent + '28', borderColor: theme.accent }]}
              onPress={() => setSelTypes((prev) => prev.filter((x) => x !== t))}
            >
              <Text style={[styles.activeChipText, { color: theme.accent }]}>{TYPE_LABELS[t]}</Text>
              <Ionicons name="close" size={12} color={theme.accent} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.countText, { color: theme.subtext }]}>{transactions.length} транзакцій</Text>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TxItem item={item} />}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.subtext }]}>
            Транзакцій не знайдено
          </Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      />

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selPlatforms={selPlatforms}
        setSelPlatforms={setSelPlatforms}
        selTypes={selTypes}
        setSelTypes={setSelTypes}
        onApply={applyFilters}
        onReset={resetFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 3,
    fontSize: 9, fontWeight: '700', color: '#000', minWidth: 12, textAlign: 'center',
  },
  chipsRow:  { flexGrow: 0, marginBottom: 6 },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  activeChipText: { fontSize: 12, fontWeight: '600' },
  countText: { fontSize: 12, marginLeft: 16, marginBottom: 6 },
  txItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  txLeft:     { flex: 1, marginRight: 8 },
  txDesc:     { fontSize: 14, marginBottom: 4 },
  txMeta:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  txPlatform: { fontSize: 11 },
  txDot:      { fontSize: 11 },
  txDate:     { fontSize: 11 },
  txFee:      { fontSize: 11 },
  txAmount:   { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  txCurrency: { fontSize: 11, fontWeight: '400' },
  emptyText:  { textAlign: 'center', paddingVertical: 40 },
});
