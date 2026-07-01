import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAccountsStore }     from '../store/accountsSlice';
import { useTransactionsStore } from '../store/transactionsSlice';
import { usePlannedIncomeStore } from '../store/plannedIncomeSlice';
import { useTheme } from '../theme/ThemeContext';
import type { Account, UnifiedTransaction, PlannedIncome } from '../types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const PLATFORM_COLORS: Record<string, string> = {
  monobank:   '#000000',
  ibkr:       '#e11d48',
  privatbank: '#16a34a',
  zen:        '#7c3aed',
  manual:     '#475569',
};

function AccountCard({ account }: { account: Account }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.accountCard, {
      backgroundColor: theme.card,
      borderLeftColor: PLATFORM_COLORS[account.platform] ?? theme.cardAlt,
    }]}>
      <View style={styles.accountCardHeader}>
        <Text style={[styles.accountName, { color: theme.text }]}>{account.name}</Text>
        <Text style={[styles.accountPlatform, { color: theme.subtext }]}>
          {account.platform.toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.accountBalance, { color: theme.text }]}>
        {account.balance != null
          ? `${account.balance.toLocaleString('uk-UA')} ${account.currency}`
          : '—'}
      </Text>
    </View>
  );
}

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
      <Text style={[styles.txAmount, { color }]}>
        {sign}{Math.abs(tx.amount).toLocaleString('uk-UA')} {tx.currency}
      </Text>
    </View>
  );
}

function PlannerAlert({ item }: { item: PlannedIncome }) {
  const { theme } = useTheme();
  const daysLeft  = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = item.status === 'overdue';

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
          {item.amount.toLocaleString('uk-UA')} {item.currency} ·{' '}
          {isOverdue ? 'Прострочено' : daysLeft === 0 ? 'Сьогодні' : `через ${daysLeft} дн.`}
        </Text>
      </View>
    </View>
  );
}

export function DashboardScreen() {
  const { theme } = useTheme();
  const { accounts, loadAccounts }           = useAccountsStore();
  const { transactions, loadTransactions }   = useTransactionsStore();
  const { items: plannedItems, loadItems }   = usePlannedIncomeStore();
  const [refreshing, setRefreshing]          = React.useState(false);

  useEffect(() => {
    loadAccounts();
    loadTransactions({ dateFrom: Date.now() - 30 * 24 * 60 * 60 * 1000 });
    loadItems();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadAccounts();
    loadTransactions();
    loadItems();
    setRefreshing(false);
  }, []);

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');

  const totalBalance = visibleAccounts
    .filter((a) => a.currency === 'UAH' && a.balance != null)
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const recentTxs      = transactions.slice(0, 10);
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
          <Text style={[styles.balanceLabel, { color: theme.subtext }]}>Загальний баланс (UAH)</Text>
          <Text style={[styles.balanceAmount, { color: theme.text }]}>
            {totalBalance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </Text>
          {visibleAccounts.length === 0 && (
            <Text style={[styles.noAccountsHint, { color: theme.subtext }]}>
              Додайте рахунки у Налаштуваннях
            </Text>
          )}
        </View>

        {/* Accounts */}
        {visibleAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Рахунки</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
              {visibleAccounts.map((a) => <AccountCard key={a.id} account={a} />)}
            </ScrollView>
          </View>
        )}

        {/* Planned */}
        {upcomingPlanned.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Очікувані надходження</Text>
            {upcomingPlanned.map((item) => <PlannerAlert key={item.id} item={item} />)}
          </View>
        )}

        {/* Recent txs */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Останні транзакції</Text>
          {recentTxs.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              Транзакцій поки немає.{'\n'}Підключіть рахунки у Налаштуваннях.
            </Text>
          ) : (
            recentTxs.map((tx) => <TxRow key={tx.id} tx={tx} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceSection: {
    paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center',
  },
  balanceLabel:    { fontSize: 14, marginBottom: 4 },
  balanceAmount:   { fontSize: 36, fontWeight: '700' },
  noAccountsHint:  { fontSize: 13, marginTop: 8, textAlign: 'center' },
  section:         { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle:    {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  accountsScroll:  { marginHorizontal: -16, paddingHorizontal: 16 },
  accountCard: {
    borderRadius: 12, padding: 16, marginRight: 12, width: 180, borderLeftWidth: 3,
  },
  accountCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  accountName:     { fontSize: 14, fontWeight: '600', flex: 1 },
  accountPlatform: { fontSize: 10 },
  accountBalance:  { fontSize: 18, fontWeight: '700' },
  plannerAlert: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1,
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
