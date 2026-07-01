import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { UnifiedTransaction, Platform, TransactionType } from '../types';
import { getDatabase } from '../db/migrations';

interface TransactionsFilter {
  platforms?: Platform[];
  types?: TransactionType[];
  dateFrom?: number;
  dateTo?: number;
  accountId?: string;
  searchText?: string;
  currency?: string;
}

interface TransactionsState {
  transactions: UnifiedTransaction[];
  isLoading: boolean;
  filter: TransactionsFilter;

  /** Завантажити транзакції з SQLite з фільтрами */
  loadTransactions: (filter?: TransactionsFilter) => void;

  /** Зберегти пакет транзакцій (після синхронізації з API) */
  upsertTransactions: (txs: UnifiedTransaction[]) => void;

  /** Оновити активний фільтр */
  setFilter: (filter: TransactionsFilter) => void;
}

function buildSelectQuery(filter: TransactionsFilter): { sql: string; params: SQLiteBindValue[] } {
  const conditions: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (filter.accountId) {
    conditions.push('account_id = ?');
    params.push(filter.accountId);
  }
  if (filter.platforms && filter.platforms.length > 0) {
    const placeholders = filter.platforms.map(() => '?').join(',');
    conditions.push(`platform IN (${placeholders})`);
    params.push(...filter.platforms);
  }
  if (filter.types && filter.types.length > 0) {
    const placeholders = filter.types.map(() => '?').join(',');
    conditions.push(`type IN (${placeholders})`);
    params.push(...filter.types);
  }
  if (filter.dateFrom != null) {
    conditions.push('transaction_date >= ?');
    params.push(filter.dateFrom);
  }
  if (filter.dateTo != null) {
    conditions.push('transaction_date <= ?');
    params.push(filter.dateTo);
  }
  if (filter.searchText) {
    conditions.push('(description LIKE ? OR counterparty LIKE ?)');
    params.push(`%${filter.searchText}%`, `%${filter.searchText}%`);
  }
  if (filter.currency) {
    conditions.push('currency = ?');
    params.push(filter.currency);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM transactions ${where} ORDER BY transaction_date DESC LIMIT 500`;
  return { sql, params };
}

function rowToTx(r: Record<string, unknown>): UnifiedTransaction {
  return {
    id:              r.id as string,
    accountId:       r.account_id as string,
    platform:        r.platform as Platform,
    externalId:      (r.external_id as string | null) ?? undefined,
    type:            r.type as TransactionType,
    amount:          r.amount as number,
    currency:        r.currency as string,
    amountBase:      (r.amount_base as number | null) ?? undefined,
    exchangeRate:    (r.exchange_rate as number | null) ?? undefined,
    feeAmount:       r.fee_amount as number,
    feeCurrency:     (r.fee_currency as string | null) ?? undefined,
    feeType:         (r.fee_type as string | null) ?? undefined,
    description:     (r.description as string | null) ?? undefined,
    category:        (r.category as string | null) ?? undefined,
    mcc:             (r.mcc as number | null) ?? undefined,
    counterparty:    (r.counterparty as string | null) ?? undefined,
    directionFrom:   (r.direction_from as string | null) ?? undefined,
    directionTo:     (r.direction_to as string | null) ?? undefined,
    transactionDate: r.transaction_date as number,
    importedAt:      r.imported_at as number,
    rawPayload:      (r.raw_payload as string | null) ?? undefined,
  };
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  isLoading: false,
  filter: {},

  loadTransactions: (filter) => {
    const activeFilter = filter ?? get().filter;
    set({ isLoading: true, filter: activeFilter });

    try {
      const db = getDatabase();
      const { sql, params } = buildSelectQuery(activeFilter);
      const rows = db.getAllSync<Record<string, unknown>>(sql, params);
      set({ transactions: rows.map(rowToTx), isLoading: false });
    } catch (e) {
      console.error('[transactionsSlice] loadTransactions error:', e);
      set({ isLoading: false });
    }
  },

  upsertTransactions: (txs) => {
    const db = getDatabase();

    // INSERT OR IGNORE — якщо (platform, external_id) вже є — пропускаємо
    const stmt = db.prepareSync(
      `INSERT OR IGNORE INTO transactions
       (id, account_id, platform, external_id, type, amount, currency,
        amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
        description, category, mcc, counterparty, direction_from, direction_to,
        transaction_date, imported_at, raw_payload)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );

    db.withTransactionSync(() => {
      for (const tx of txs) {
        stmt.executeSync([
          tx.id, tx.accountId, tx.platform, tx.externalId ?? null,
          tx.type, tx.amount, tx.currency,
          tx.amountBase ?? null, tx.exchangeRate ?? null,
          tx.feeAmount, tx.feeCurrency ?? null, tx.feeType ?? null,
          tx.description ?? null, tx.category ?? null, tx.mcc ?? null,
          tx.counterparty ?? null, tx.directionFrom ?? null, tx.directionTo ?? null,
          tx.transactionDate, tx.importedAt, tx.rawPayload ?? null,
        ]);
      }
    });

    stmt.finalizeSync();

    // Перезавантажити список з тим самим фільтром
    get().loadTransactions();
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadTransactions(filter);
  },
}));
