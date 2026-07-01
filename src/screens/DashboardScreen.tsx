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
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { Account, UnifiedTransaction, PlannedIncome } from '../types';
import { currencySymbol } from '../utils/currency';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { getDatabase } from '../db/migrations';

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
  const { theme } = useTheme();
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={[ceStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[ceStyles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={ceStyles.header}>
            <Text style={[ceStyles.title, { color: theme.text }]}>{t.dashEditCard}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={[ceStyles.preview, { backgroundColor: color }]}>
            <Text style={ceStyles.previewPlatform}>{account.platform.toUpperCase()}</Text>
            <Text style={ceStyles.previewBalance}>
              {account.balance != null
                ? `${account.balance.toLocaleString('uk-UA')} ${currencySymbol(account.currency)} ${account.currency}`
                : '—'}
            </Text>
            <Text style={ceStyles.previewName}>{name || account.name}</Text>
          </View>

          {/* Name input */}
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

// ─── Account Card ─────────────────────────────────────

function AccountCard({ account, onEdit, fadeAnim }: {
  account: Account; onEdit: () => void; fadeAnim: Animated.Value;
}) {
  const { theme }   = useTheme();
  const cardColor   = account.color ?? '#1e293b';

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[styles.accountCard, { backgroundColor: cardColor }]}
        onLongPress={onEdit}
        activeOpacity={0.85}
      >
        <View style={styles.accountCardHeader}>
          <Text style={[styles.accountPlatform, { color: 'rgba(255,255,255,0.65)' }]}>
            {account.platform.toUpperCase()}
          </Text>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} activeOpacity={0.75}>
            <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.accountBalance, { color: '#fff' }]}>
          {account.balance != null
            ? `${account.balance.toLocaleString('uk-UA')} ${currencySymbol(account.currency)}`
            : '—'}
        </Text>
        <Text style={[styles.accountName, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
          {account.displayName ?? account.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Exchange Rates Widget ────────────────────────────

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP'];

function ExchangeRatesWidget() {
  const { theme } = useTheme();
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
    <View style={[erStyles.container, { backgroundColor: theme.card }]}>
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
          <View style={[erStyles.pickerSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
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

// ─── Recent TX Row ────────────────────────────────────

function TxRow({ tx }: { tx: UnifiedTransaction }) {
  const { theme } = useTheme();
  const isIncome = tx.type === 'income';
  const sign     = isIncome ? '+' : tx.type === 'expense' ? '−' : '';
  const color    = isIncome ? theme.income : tx.type === 'expense' ? theme.expense : theme.subtext;

  return (
    <View style={[styles.txRow, { borderBottomColor: theme.border }]}>
      <View style={styles.txLeft}>
        <Text style={[styles.txDesc, { color: theme.text }]} numberOfLines={1}>
          {tx.description ?? tx.category ?? 'Транзакція'}
        </Text>
        <Text style={[styles.txDate, { color: theme.subtext }]}>
          {format(tx.transactionDate, 'd MMM', { locale: uk })} · {tx.platform}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color, paddingRight: 12 }]}>
        {sign}{Math.abs(tx.amount).toLocaleString('uk-UA')} {currencySymbol(tx.currency)}
      </Text>
    </View>
  );
}

// ─── Planner Alert ────────────────────────────────────

function PlannerAlert({ item }: { item: PlannedIncome }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const daysLeft  = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = item.status === 'overdue';

  const subText = isOverdue
    ? t.overdue
    : daysLeft === 0
    ? t.today
    : t.inDays.replace('{n}', String(daysLeft));

  return (
    <View style={[styles.plannerAlert, {
      backgroundColor: theme.card,
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
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { accounts, loadAccounts, updateDisplay }  = useAccountsStore();
  const { transactions, loadTransactions }          = useTransactionsStore();
  const { items: plannedItems, loadItems }           = usePlannedIncomeStore();
  const [refreshing,   setRefreshing]   = React.useState(false);
  const [editAccount,  setEditAccount]  = useState<Account | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAccounts();
    loadTransactions({});
    loadItems();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadAccounts();
    loadTransactions({});
    loadItems();
    setRefreshing(false);
  }, []);

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');

  const totalBalance = visibleAccounts
    .filter((a) => a.currency === 'UAH' && a.balance != null)
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const recentTxs       = transactions.slice(0, 10);
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
            {totalBalance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </Text>
          {visibleAccounts.length === 0 && (
            <Text style={[styles.noAccountsHint, { color: theme.subtext }]}>{t.dashAddAccounts}</Text>
          )}
        </View>

        {/* Accounts */}
        {visibleAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{t.dashAccounts}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
              {visibleAccounts.map((a) => (
                <AccountCard key={a.id} account={a} fadeAnim={fadeAnim} onEdit={() => setEditAccount(a)} />
              ))}
            </ScrollView>
          </View>
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
          {recentTxs.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.subtext }]}>{t.dashNoTx}</Text>
          ) : (
            recentTxs.map((tx) => <TxRow key={tx.id} tx={tx} />)
          )}
        </View>
      </ScrollView>

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
  accountsScroll:  { marginHorizontal: -16, paddingHorizontal: 16 },
  accountCard: {
    borderRadius: 16, padding: 14, marginRight: 12, width: 180, minHeight: 100,
    justifyContent: 'space-between',
  },
  accountCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountPlatform: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  accountBalance:  { fontSize: 17, fontWeight: '800' },
  accountName:     { fontSize: 11 },
  plannerAlert: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  plannerName: { fontSize: 14, fontWeight: '500' },
  plannerSub:  { fontSize: 12, marginTop: 2 },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  txLeft:   { flex: 1, marginRight: 8 },
  txDesc:   { fontSize: 14 },
  txDate:   { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center', paddingVertical: 20 },
});
