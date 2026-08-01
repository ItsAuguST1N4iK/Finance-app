import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { PressableScale } from '../../components/PressableScale';
import { AppRefreshControl } from '../../components/AppRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAccountsStore }     from '../../store/accountsSlice';
import { useTransactionsStore } from '../../store/transactionsSlice';
import { usePlannedIncomeStore } from '../../store/plannedIncomeSlice';
import { useExchangeRatesStore } from '../../store/exchangeRatesSlice';
import { useAnalyticsStore } from '../../store/analyticsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { TransactionListItem } from '../../components/TransactionListItem';
import { AccountCard, ACCOUNT_CARD_SNAP, ACCOUNT_CARD_WIDTH } from '../../components/AccountCard';
import { AddAccountModal } from '../../components/AddAccountModal';
import { DateSeparator } from '../../components/DateSeparator';
import { TxDetailModal } from '../../components/TxDetailModal';
import { EmptyState } from '../../components/EmptyState';
import { useCategoryLabels } from '../../hooks/useCategoryLabels';
import type { Account, UnifiedTransaction } from '../../types';
import { currencySymbol } from '../../utils/currency';
import { tryConvertToHomeCurrency } from '../../utils/currencyConvert';
import { dateFnsLocale, numberLocale } from '../../utils/locale';
import { sectionLabelStyle } from '../../theme/commonStyles';
import { layout, radius, space, stroke, type } from '../../theme/tokens';
import { format } from 'date-fns';
import { CardEditModal } from '../../components/CardEditModal';
import { ExchangeRatesWidget } from './ExchangeRatesWidget';
import { PlannerAlert } from './PlannerAlert';
import { ScreenEnter } from '../../components/ScreenEnter';

// ─── Main Screen ──────────────────────────────────────

export function DashboardScreen() {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const dateLoc = dateFnsLocale(language);
  const { accounts, loadAccounts, updateDisplay, addAccount }  = useAccountsStore();
  const { recentTransactions, loadRecentTransactions, dataVersion } = useTransactionsStore();
  const { items: plannedItems, loadItems }           = usePlannedIncomeStore();
  const { homeCurrency, loadHomeCurrency } = useAnalyticsStore();
  const { rates, fetchRates } = useExchangeRatesStore();
  const categoryLabels = useCategoryLabels();
  const [refreshing,   setRefreshing]   = React.useState(false);
  const [editAccount,  setEditAccount]  = useState<Account | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [detailTx,     setDetailTx]     = useState<UnifiedTransaction | null>(null);

  useEffect(() => {
    loadAccounts();
    loadRecentTransactions();
    loadItems();
    loadHomeCurrency();
    fetchRates();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentTransactions();
      loadHomeCurrency();
      void fetchRates();
    }, [loadRecentTransactions, loadHomeCurrency, fetchRates]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadAccounts(true);
    loadRecentTransactions();
    loadItems();
    loadHomeCurrency();
    await fetchRates();
    setRefreshing(false);
  }, [loadAccounts, loadRecentTransactions, loadItems, loadHomeCurrency, fetchRates]);

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default' && a.isActive);

  const totalBalance = visibleAccounts.reduce((sum, a) => {
    if (a.balance == null) return sum;
    const converted = tryConvertToHomeCurrency(a.balance, a.currency, homeCurrency, rates);
    // Skip accounts we cannot convert — never treat UAH as USD/etc.
    if (converted == null) return sum;
    return sum + converted;
  }, 0);
  const balanceSym = currencySymbol(homeCurrency);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const upcomingPlanned = plannedItems
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScreenEnter>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Balance */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceLabel, { color: theme.subtext }]}>{t.dashTotalBalance}</Text>
          <Text style={[styles.balanceAmount, { color: theme.text }]}>
            {totalBalance.toLocaleString(loc, { minimumFractionDigits: 2 })} {balanceSym}
          </Text>
          {visibleAccounts.length === 0 && (
            <Text style={[styles.noAccountsHint, { color: theme.subtext }]}>{t.dashAddAccounts}</Text>
          )}
        </View>

        {/* Accounts */}
        <View style={styles.section}>
          <Text style={sectionLabelStyle(theme.subtext)}>{t.dashAccounts}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.accountsScroll}
            contentContainerStyle={styles.accountsListContent}
            snapToInterval={ACCOUNT_CARD_SNAP}
            decelerationRate="fast"
          >
            {visibleAccounts.map((item) => (
              <AccountCard
                key={item.id}
                account={item}
                onEdit={() => setEditAccount(item)}
              />
            ))}
            <PressableScale
              style={[styles.addCardBtn, cardSurface(), { borderColor: theme.accent + '55', width: ACCOUNT_CARD_WIDTH }]}
              onPress={() => setShowAddAccount(true)}
              feedback="opacity"
            >
              <Ionicons name="add-circle-outline" size={28} color={theme.accent} />
              <Text style={[styles.addCardText, { color: theme.accent }]}>{t.settingsAddAccount}</Text>
            </PressableScale>
          </ScrollView>
        </View>

        {/* Exchange rates */}
        <View style={styles.section}>
          <Text style={sectionLabelStyle(theme.subtext)}>{t.dashExchangeRates}</Text>
          <ExchangeRatesWidget />
        </View>

        {/* Planned */}
        {upcomingPlanned.length > 0 && (
          <View style={styles.section}>
            <Text style={sectionLabelStyle(theme.subtext)}>{t.dashUpcoming}</Text>
            {upcomingPlanned.map((item) => <PlannerAlert key={item.id} item={item} />)}
          </View>
        )}

        {/* Recent txs */}
        <View style={[styles.section, { paddingBottom: layout.listBottom }]}>
          <Text style={sectionLabelStyle(theme.subtext)}>{t.dashRecentTx}</Text>
          {recentTransactions.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={t.dashNoTx}
              subtitle={t.dashNoTxHint}
              compact
            />
          ) : (
            recentTransactions.map((tx, idx) => {
              const acc = accountMap.get(tx.accountId);
              const dateLabel = format(tx.transactionDate, 'd MMMM yyyy', { locale: dateLoc });
              const prevDate = idx > 0
                ? format(recentTransactions[idx - 1].transactionDate, 'd MMMM yyyy', { locale: dateLoc })
                : '';
              return (
                <React.Fragment key={`${tx.id}_${dataVersion}`}>
                  {dateLabel !== prevDate && <DateSeparator label={dateLabel} />}
                  <TransactionListItem
                    item={tx}
                    categoryLabels={categoryLabels}
                    accountColor={acc?.color ?? theme.accent}
                    accountName={acc ? (acc.displayName ?? acc.name) : tx.platform}
                    onPress={setDetailTx}
                  />
                </React.Fragment>
              );
            })
          )}
        </View>
      </ScrollView>
      </ScreenEnter>

      <TxDetailModal
        item={detailTx}
        visible={!!detailTx}
        onClose={() => setDetailTx(null)}
      />

      <AddAccountModal
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        onAdd={(platform, name, currency, color) => {
          addAccount({ platform, name, currency, color, displayName: name, balance: 0, isActive: true });
          loadAccounts();
        }}
      />

      {/* Card Edit Modal */}
      <CardEditModal
        account={editAccount}
        visible={!!editAccount}
        onClose={() => setEditAccount(null)}
        onSave={(name, color) => {
          if (!editAccount) return;
          updateDisplay(editAccount.id, name, color);
          setEditAccount(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceSection: {
    paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[1], alignItems: 'center',
  },
  balanceLabel: { fontSize: 12, marginBottom: 2 },
  balanceAmount: { ...type.hero, fontSize: 28 },
  noAccountsHint: { fontSize: 13, marginTop: space[1], textAlign: 'center' },
  section: { paddingHorizontal: layout.screenPad, marginBottom: space[2.5] },
  accountsScroll: { marginHorizontal: -layout.screenPad },
  accountsListContent: { paddingHorizontal: layout.screenPad, paddingVertical: 0 },
  addCardBtn: {
    height: 88,
    borderRadius: radius.lg,
    borderWidth: stroke.width,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    marginLeft: space[1],
  },
  addCardText: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: space[2] },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: space[3] },
});
