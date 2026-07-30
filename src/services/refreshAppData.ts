import { useTransactionsStore } from '../store/transactionsSlice';
import { useAnalyticsStore } from '../store/analyticsSlice';
import { useAccountsStore } from '../store/accountsSlice';
import { useExchangeRatesStore } from '../store/exchangeRatesSlice';

export type RefreshScope = 'all' | 'transactions' | 'analytics';

/**
 * App-wide data refresh orchestration.
 * Lives in services/ so screens/utils don't grow sync concerns.
 */
export async function refreshAppData(scope: RefreshScope = 'all'): Promise<void> {
  if (scope === 'all' || scope === 'transactions') {
    const { loadTransactions, loadRecentTransactions, filter } = useTransactionsStore.getState();
    loadTransactions(filter);
    loadRecentTransactions();
  }

  if (scope === 'all' || scope === 'analytics') {
    useAnalyticsStore.getState().loadHomeCurrency();
    useAnalyticsStore.getState().compute();
  }

  if (scope === 'all') {
    useAccountsStore.getState().loadAccounts();
    await useExchangeRatesStore.getState().fetchRates();
  }
}
