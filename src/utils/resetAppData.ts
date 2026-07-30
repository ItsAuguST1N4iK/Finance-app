import { getDatabase } from '../db/migrations';
import { tokenStore, TOKEN_KEYS } from '../security/tokenStore';

/** Wipe all user financial data while keeping accounts and settings structure. */
export function resetAllFinancialData(): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM planned_income');
    db.runSync('UPDATE accounts SET balance = NULL');
    db.runSync(`UPDATE settings SET last_sync_at = NULL WHERE id = 1`);
  });
}

/** Reset preferred/home currencies and delete stored API tokens. */
export async function resetAppSettings(): Promise<void> {
  const db = getDatabase();
  db.runSync(`UPDATE settings SET
    preferred_currencies = '["USD","EUR","GBP"]',
    base_currency_exchange = 'UAH',
    home_currency = 'UAH'
    WHERE id = 1`);
  await tokenStore.delete(TOKEN_KEYS.monobank);
  await tokenStore.delete(TOKEN_KEYS.ibkrFlexToken);
  await tokenStore.delete(TOKEN_KEYS.ibkrQueryId);
}
