import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAccountsStore }     from '../store/accountsSlice';
import { useTransactionsStore } from '../store/transactionsSlice';
import { usePlannedIncomeStore } from '../store/plannedIncomeSlice';
import { useExchangeRatesStore } from '../store/exchangeRatesSlice';
import { useAnalyticsStore } from '../store/analyticsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { TransactionListItem } from '../components/TransactionListItem';
import { AccountCard, ACCOUNT_CARD_SNAP } from '../components/AccountCard';
import { CardPreview } from '../components/CardPreview';
import { DateSeparator } from '../components/DateSeparator';
import { TxDetailModal } from '../components/TxDetailModal';
import { useCategoryLabels } from '../hooks/useCategoryLabels';
import type { Account, PlannedIncome, UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';
import { convertToHomeCurrency } from '../utils/currencyConvert';
import { HIT_BTN } from '../utils/hitSlop';
import { getDatabase } from '../db/migrations';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

// ─── Color presets for card editing ──────────────────

const CARD_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#f97316',
  '#64748b', '#000000', '#1e293b', '#16a34a',
];

const ALL_CURRENCIES = ['UAH', 'USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK', 'CAD', 'AUD', 'JPY'];

// ─── Card Edit Modal ──────────────────────────────────

interface CardEditModalProps {
  account: Account;
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

function CardEditModal({ account, visible, onClose, onSave }: CardEditModalProps) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const [name,  setName]  = useState(account.displayName ?? account.name);
  const [color, setColor] = useState(account.color ?? '#3b82f6');

  useEffect(() => {
    if (visible) {
      setName(account.displayName ?? account.name);
      setColor(account.color ?? '#3b82f6');
    }
  }, [visible, account]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
      <View style={[ceStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[ceStyles.sheet, cardSurface(), { borderColor: theme.border }]}>
          <View style={ceStyles.header}>
            <Text style={[ceStyles.title, { color: theme.text }]}>{t.dashEditCard}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <CardPreview account={account} name={name} color={color} />
          <Text style={[ceStyles.label, { color: theme.subtext }]}>{t.dashCardName}</Text>
          <TextInput
            style={[ceStyles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder={account.name}
            placeholderTextColor={theme.subtext}
          />

          {/* Color picker */}
          <Text style={[ceStyles.label, { color: theme.subtext, marginTop: 12 }]}>{t.dashCardColor}</Text>
          <View style={ceStyles.colorsRow}>
            {CARD_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[ceStyles.colorDot, { backgroundColor: c },
                  c === color && ceStyles.colorDotActive]}
                onPress={() => setColor(c)}
                activeOpacity={0.75}
              />
            ))}
          </View>

          <View style={ceStyles.footer}>
            <TouchableOpacity style={[ceStyles.cancelBtn, { borderColor: theme.border }]} onPress={onClose} activeOpacity={0.75}>
              <Text style={[ceStyles.cancelText, { color: theme.subtext }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ceStyles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={() => { onSave(name.trim() || account.name, color); onClose(); }}
              activeOpacity={0.75}
            >
              <Text style={ceStyles.saveBtnText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ceStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, padding: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  preview: {
    borderRadius: 14, padding: 16, marginBottom: 16, minHeight: 90, justifyContent: 'space-between',
  },
  previewPlatform: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  previewBalance:  { color: '#fff', fontSize: 18, fontWeight: '700' },
  previewName:     { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  label:           { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:           { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  colorsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot:        { width: 32, height: 32, borderRadius: 16 },
  colorDotActive:  { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  footer:          { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:       { flex: 1, borderWidth: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText:      { fontSize: 15, fontWeight: '600' },
  saveBtn:         { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Exchange Rates Widget ────────────────────────────

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP'];

function ExchangeRatesWidget() {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const { rates, updatedAt, isLoading, fetchRates } = useExchangeRatesStore();
  const [currencies,    setCurrencies]    = useState<string[]>(DEFAULT_CURRENCIES);
  const [baseCurrency,  setBaseCurrency]  = useState<string>('UAH');
  const [pickerVisible, setPickerVisible] = useState(false);

  function loadSettings() {
    try {
      const db  = getDatabase();
      const row = db.getFirstSync<{ preferred_currencies: string | null; base_currency_exchange: string | null }>(
        'SELECT preferred_currencies, base_currency_exchange FROM settings WHERE id = 1'
      );
      if (row?.preferred_currencies) {
        const parsed = JSON.parse(row.preferred_currencies) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setCurrencies(parsed);
      }
      if (row?.base_currency_exchange) {
        setBaseCurrency(row.base_currency_exchange);
      }
    } catch {}
  }

  useEffect(() => {
    loadSettings();
    fetchRates();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  function saveBaseCurrency(code: string) {
    setBaseCurrency(code);
    setPickerVisible(false);
    try {
      getDatabase().runSync(
        'UPDATE settings SET base_currency_exchange = ? WHERE id = 1',
        [code]
      );
    } catch {}
  }

  /** Compute display rates relative to baseCurrency */
  function getDisplayRates(): Array<{ code: string; buy: number; sell: number }> {
    const displayCodes = currencies.filter((c) => c !== baseCurrency);
    // Add UAH only when base != UAH
    const codesToShow = baseCurrency === 'UAH' ? currencies : [...displayCodes, 'UAH'];

    if (baseCurrency === 'UAH') {
      return rates
        .filter((r) => currencies.includes(r.code))
        .map((r) => ({ code: r.code, buy: r.rateBuy, sell: r.rateSell }));
    }

    const baseRate = rates.find((r) => r.code === baseCurrency);
    if (!baseRate || baseRate.rateBuy === 0 || baseRate.rateSell === 0) return [];

    return codesToShow.flatMap((code) => {
      if (code === 'UAH') {
        return [{ code: 'UAH', buy: 1 / baseRate.rateSell, sell: 1 / baseRate.rateBuy }];
      }
      const r = rates.find((x) => x.code === code);
      if (!r) return [];
      return [{ code, buy: r.rateBuy / baseRate.rateBuy, sell: r.rateSell / baseRate.rateSell }];
    });
  }

  const shownRates = getDisplayRates();

  return (
    <View style={[erStyles.container, cardSurface()]}>
      {/* Header: "Обмін валюти" + currency picker + refresh */}
      <View style={[erStyles.header, { borderBottomColor: theme.border }]}>
        <View style={erStyles.headerLeft}>
          <Text style={[erStyles.baseCurrencyLabel, { color: theme.subtext }]}>{t.dashBaseCurrency}</Text>
          <TouchableOpacity
            style={[erStyles.baseCurrencyBtn, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '66' }]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={[erStyles.baseCurrencyBtnText, { color: theme.accent }]}>
              {currencySymbol(baseCurrency)} {baseCurrency}
            </Text>
            <Ionicons name="chevron-down" size={12} color={theme.accent} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={fetchRates} disabled={isLoading} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} activeOpacity={0.75}>
          <Ionicons
            name={isLoading ? 'hourglass-outline' : 'refresh-outline'}
            size={16}
            color={theme.accent}
          />
        </TouchableOpacity>
      </View>

      <View style={erStyles.tableHeader}>
        <Text style={[erStyles.colHead, { flex: 2, color: theme.subtext }]}>
          {currencySymbol(baseCurrency)} {baseCurrency}
        </Text>
        <Text style={[erStyles.colHead, { color: theme.subtext }]}>{t.dashBuy}</Text>
        <Text style={[erStyles.colHead, { color: theme.subtext }]}>{t.dashSell}</Text>
      </View>

      {shownRates.map((r) => (
        <View key={r.code} style={[erStyles.row, { borderBottomColor: theme.border }]}>
          <Text style={[erStyles.code, { color: theme.text }]}>
            {currencySymbol(r.code)} {r.code}
          </Text>
          <Text style={[erStyles.rate, { color: theme.income }]}>
            {r.buy.toFixed(r.buy < 1 ? 4 : 2)}
          </Text>
          <Text style={[erStyles.rate, { color: theme.expense }]}>
            {r.sell.toFixed(r.sell < 1 ? 4 : 2)}
          </Text>
        </View>
      ))}

      {updatedAt && (
        <Text style={[erStyles.hint, { color: theme.subtext }]}>
          {new Date(updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      {/* Base currency picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity
          style={[erStyles.pickerOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[erStyles.pickerSheet, cardSurface(), { borderColor: theme.border }]}>
            <Text style={[erStyles.pickerTitle, { color: theme.text }]}>{t.dashBaseCurrency}</Text>
            {ALL_CURRENCIES.map((code) => (
              <TouchableOpacity
                key={code}
                style={[erStyles.pickerItem, code === baseCurrency && { backgroundColor: theme.accent + '22' }]}
                onPress={() => saveBaseCurrency(code)}
                activeOpacity={0.75}
              >
                <Text style={[erStyles.pickerItemText, { color: code === baseCurrency ? theme.accent : theme.text }]}>
                  {currencySymbol(code)} {code}
                </Text>
                {code === baseCurrency && <Ionicons name="checkmark" size={16} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const erStyles = StyleSheet.create({
  container:    { borderRadius: 14, padding: 14, marginBottom: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 10, marginBottom: 8, borderBottomWidth: 1,
  },
  headerLeft:           { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  baseCurrencyLabel:    { fontSize: 12, fontWeight: '600' },
  baseCurrencyBtn:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  baseCurrencyBtnText:  { fontSize: 13, fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row', paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: 'transparent', marginBottom: 4,
  },
  colHead:  { flex: 1, fontSize: 10, fontWeight: '600', textAlign: 'right' },
  row:      { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1 },
  code:     { flex: 2, fontSize: 13, fontWeight: '600' },
  rate:     { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '500' },
  hint:     { fontSize: 10, marginTop: 8, textAlign: 'right' },
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  pickerSheet: {
    borderRadius: 16, padding: 16, borderWidth: 1, width: '100%',
  },
  pickerTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  pickerItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderRadius: 8, paddingHorizontal: 8 },
  pickerItemText: { fontSize: 15, fontWeight: '500' },
});

// ─── Planner Alert ────────────────────────────────────

function PlannerAlert({ item }: { item: PlannedIncome }) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const daysLeft  = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = item.status === 'overdue';

  const subText = isOverdue
    ? t.overdue
    : daysLeft === 0
    ? t.today
    : t.inDays.replace('{n}', String(daysLeft));

  return (
    <View style={[styles.plannerAlert, cardSurface(), {
      borderColor: isOverdue ? theme.expense : theme.warning,
    }]}>
      <Ionicons
        name={isOverdue ? 'warning-outline' : 'calendar-outline'}
        size={16}
        color={isOverdue ? theme.expense : theme.warning}
      />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[styles.plannerName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.plannerSub, { color: theme.subtext }]}>
          {item.amount.toLocaleString('uk-UA')} {currencySymbol(item.currency)} · {subText}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────

export function DashboardScreen() {
  const { theme, dur, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const { accounts, loadAccounts, updateDisplay }  = useAccountsStore();
  const { recentTransactions, loadRecentTransactions } = useTransactionsStore();
  const { items: plannedItems, loadItems }           = usePlannedIncomeStore();
  const { homeCurrency, loadHomeCurrency } = useAnalyticsStore();
  const { rates, fetchRates } = useExchangeRatesStore();
  const categoryLabels = useCategoryLabels();
  const [refreshing,   setRefreshing]   = React.useState(false);
  const [editAccount,  setEditAccount]  = useState<Account | null>(null);
  const [detailTx,     setDetailTx]     = useState<UnifiedTransaction | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAccounts();
    loadRecentTransactions();
    loadItems();
    loadHomeCurrency();
    fetchRates();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: dur(300),
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentTransactions();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadAccounts();
    loadRecentTransactions();
    loadItems();
    setRefreshing(false);
  }, []);

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');

  const totalBalance = visibleAccounts.reduce((sum, a) => {
    if (a.balance == null) return sum;
    return sum + convertToHomeCurrency(a.balance, a.currency, homeCurrency, rates);
  }, 0);
  const balanceSym = currencySymbol(homeCurrency);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const upcomingPlanned = plannedItems
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Balance */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceLabel, { color: theme.subtext }]}>{t.dashTotalBalance}</Text>
          <Text style={[styles.balanceAmount, { color: theme.text }]}>
            {totalBalance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} {balanceSym}
          </Text>
          {visibleAccounts.length === 0 && (
            <Text style={[styles.noAccountsHint, { color: theme.subtext }]}>{t.dashAddAccounts}</Text>
          )}
        </View>

        {/* Accounts */}
        {visibleAccounts.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.dashAccounts}</Text>
            <Animated.FlatList
              horizontal
              data={visibleAccounts}
              keyExtractor={(a) => a.id}
              showsHorizontalScrollIndicator={false}
              style={styles.accountsScroll}
              contentContainerStyle={styles.accountsListContent}
              snapToInterval={ACCOUNT_CARD_SNAP}
              decelerationRate="fast"
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true },
              )}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => (
                <AccountCard
                  account={item}
                  index={index}
                  selected={selectedAccountId === item.id}
                  scrollX={scrollX}
                  onSelect={() => setSelectedAccountId(
                    selectedAccountId === item.id ? null : item.id,
                  )}
                  onEdit={() => setEditAccount(item)}
                />
              )}
            />
          </Animated.View>
        )}

        {/* Exchange rates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.dashExchangeRates}</Text>
          <ExchangeRatesWidget />
        </View>

        {/* Planned */}
        {upcomingPlanned.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.dashUpcoming}</Text>
            {upcomingPlanned.map((item) => <PlannerAlert key={item.id} item={item} />)}
          </View>
        )}

        {/* Recent txs */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.dashRecentTx}</Text>
          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.subtext }]}>{t.dashNoTx}</Text>
          ) : (
            recentTransactions.map((tx, idx) => {
              const acc = accountMap.get(tx.accountId);
              const dateLabel = format(tx.transactionDate, 'd MMMM yyyy', { locale: uk });
              const prevDate = idx > 0
                ? format(recentTransactions[idx - 1].transactionDate, 'd MMMM yyyy', { locale: uk })
                : '';
              return (
                <React.Fragment key={tx.id}>
                  {dateLabel !== prevDate && <DateSeparator label={dateLabel} />}
                  <TransactionListItem
                    item={tx}
                    categoryLabels={categoryLabels}
                    accountColor={acc?.color ?? theme.accent}
                    accountName={acc ? (acc.displayName ?? acc.name) : tx.platform}
                    onPress={() => setDetailTx(tx)}
                  />
                </React.Fragment>
              );
            })
          )}
        </View>
      </ScrollView>

      <TxDetailModal
        item={detailTx}
        visible={!!detailTx}
        onClose={() => setDetailTx(null)}
      />

      {/* Card Edit Modal */}
      {editAccount && (
        <CardEditModal
          account={editAccount}
          visible={!!editAccount}
          onClose={() => setEditAccount(null)}
          onSave={(name, color) => {
            updateDisplay(editAccount.id, name, color);
            setEditAccount(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceSection: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, alignItems: 'center',
  },
  balanceLabel:    { fontSize: 13, marginBottom: 4 },
  balanceAmount:   { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  noAccountsHint:  { fontSize: 13, marginTop: 8, textAlign: 'center' },
  section:         { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle:    {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  accountsScroll:  { marginHorizontal: -16 },
  accountsListContent: { paddingHorizontal: 16, paddingVertical: 16 },
  plannerAlert: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  plannerName: { fontSize: 14, fontWeight: '500' },
  plannerSub:  { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center', paddingVertical: 20 },
});
