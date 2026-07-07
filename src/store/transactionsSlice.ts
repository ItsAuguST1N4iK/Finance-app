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
  tag?: string | '__none__';
}

export interface UpsertResult {
  inserted: number;
  total: number;
}

interface TransactionsState {
  transactions: UnifiedTransaction[];
  recentTransactions: UnifiedTransaction[];
  totalCount: number;
  isLoading: boolean;
  filter: TransactionsFilter;

  loadTransactions: (filter?: TransactionsFilter) => void;
  loadRecentTransactions: () => void;
  getTotalCount: () => number;
  upsertTransactions: (txs: UnifiedTransaction[]) => UpsertResult;
  updateTransactionTag: (id: string, tag: string | null, category?: string | null) => void;
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
    conditions.push('(description LIKE ? OR counterparty LIKE ? OR tag LIKE ?)');
    params.push(`%${filter.searchText}%`, `%${filter.searchText}%`, `%${filter.searchText}%`);
  }
  if (filter.currency) {
    conditions.push('currency = ?');
    params.push(filter.currency);
  }
  if (filter.tag === '__none__') {
    conditions.push('tag IS NULL');
  } else if (filter.tag) {
    conditions.push('tag = ?');
    params.push(filter.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM transactions ${where} ORDER BY transaction_date DESC`;
  return { sql, params };
}

function buildCountQuery(filter: TransactionsFilter): { sql: string; params: SQLiteBindValue[] } {
  const { sql, params } = buildSelectQuery(filter);
  return { sql: sql.replace('SELECT *', 'SELECT COUNT(*) as cnt'), params };
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
    tag:             (r.tag as string | null) ?? undefined,
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
  recentTransactions: [],
  totalCount: 0,
  isLoading: false,
  filter: {},

  loadRecentTransactions: () => {
    try {
      const db = getDatabase();
      const rows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM transactions ORDER BY transaction_date DESC LIMIT 10',
      );
      set({ recentTransactions: rows.map(rowToTx) });
    } catch (e) {
      console.error('[transactionsSlice] loadRecentTransactions error:', e);
    }
  },

  loadTransactions: (filter) => {
    const activeFilter = filter ?? get().filter;
    set({ isLoading: true, filter: activeFilter });

    try {
      const db = getDatabase();
      const { sql, params } = buildSelectQuery(activeFilter);
      const rows = db.getAllSync<Record<string, unknown>>(sql, params);
      const { sql: countSql, params: countParams } = buildCountQuery(activeFilter);
      const countRow = db.getFirstSync<{ cnt: number }>(countSql, countParams);
      set({
        transactions: rows.map(rowToTx),
        totalCount: countRow?.cnt ?? rows.length,
        isLoading: false,
      });
    } catch (e) {
      console.error('[transactionsSlice] loadTransactions error:', e);
      set({ isLoading: false });
    }
  },

  getTotalCount: () => {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transactions');
      return row?.cnt ?? 0;
    } catch {
      return 0;
    }
  },

  upsertTransactions: (txs) => {
    const db = getDatabase();
    let inserted = 0;

    const insertStmt = db.prepareSync(
      `INSERT INTO transactions
       (id, account_id, platform, external_id, type, amount, currency,
        amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
        description, category, tag, mcc, counterparty, direction_from, direction_to,
        transaction_date, imported_at, raw_payload)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    );

    try {
      db.withTransactionSync(() => {
        for (const tx of txs) {
          try {
            insertStmt.executeSync([
              tx.id, tx.accountId, tx.platform, tx.externalId ?? null,
              tx.type, tx.amount, tx.currency,
              tx.amountBase ?? null, tx.exchangeRate ?? null,
              tx.feeAmount, tx.feeCurrency ?? null, tx.feeType ?? null,
              tx.description ?? null, tx.category ?? null, tx.tag ?? null, tx.mcc ?? null,
              tx.counterparty ?? null, tx.directionFrom ?? null, tx.directionTo ?? null,
              tx.transactionDate, tx.importedAt, tx.rawPayload ?? null,
            ]);
            inserted++;
          } catch (e) {
            console.warn('[transactionsSlice] skip insert:', tx.id, e);
          }
        }
      });
    } finally {
      insertStmt.finalizeSync();
    }

    get().loadTransactions();
    get().loadRecentTransactions();
    return { inserted, total: txs.length };
  },

  updateTransactionTag: (id, tag, category) => {
    try {
      const db = getDatabase();
      if (category !== undefined) {
        db.runSync('UPDATE transactions SET tag = ?, category = ? WHERE id = ?', [tag, category, id]);
      } else {
        db.runSync('UPDATE transactions SET tag = ? WHERE id = ?', [tag, id]);
      }
      const patch = (tx: UnifiedTransaction) =>
        tx.id === id
          ? { ...tx, tag: tag ?? undefined, ...(category !== undefined ? { category: category ?? undefined } : {}) }
          : tx;
      set((state) => ({
        transactions: state.transactions.map(patch),
        recentTransactions: state.recentTransactions.map(patch),
      }));
    } catch (e) {
      console.error('[transactionsSlice] updateTransactionTag error:', e);
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadTransactions(filter);
  },
}));
