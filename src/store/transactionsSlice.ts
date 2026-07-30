import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { UnifiedTransaction, Platform, TransactionType } from '../types';
import { getDatabase } from '../db/migrations';
import { investmentPurchaseSql } from '../utils/categories';
import { makeTransactionFingerprint } from '../utils/dedup';
import { markBalancesDirty } from '../utils/accountBalance';

const PAGE_SIZE = 150;

interface TransactionsFilter {
  platforms?: Platform[];
  types?: TransactionType[];
  dateFrom?: number;
  dateTo?: number;
  accountId?: string;
  searchText?: string;
  currency?: string;
  currencies?: string[];
  tag?: string | '__none__';
  tags?: string[];
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  total: number;
}

interface TransactionsState {
  transactions: UnifiedTransaction[];
  recentTransactions: UnifiedTransaction[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  filter: TransactionsFilter;
  dataVersion: number;

  loadTransactions: (filter?: TransactionsFilter) => void;
  loadMoreTransactions: () => void;
  loadRecentTransactions: () => void;
  getTotalCount: () => number;
  upsertTransactions: (txs: UnifiedTransaction[], opts?: { forceInsert?: boolean }) => UpsertResult;
  updateTransactionTag: (id: string, tag: string | null, category?: string | null) => void;
  /** Unlock category_locked and set tag/category (used after auto-redetect). */
  unlockAndSetCategory: (id: string, tag: string, category: string) => void;
  setFilter: (filter: TransactionsFilter) => void;
  bumpDataVersion: () => void;
}

function buildWhere(filter: TransactionsFilter): { where: string; params: SQLiteBindValue[] } {
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
  if (filter.currencies && filter.currencies.length > 0) {
    const placeholders = filter.currencies.map(() => '?').join(',');
    conditions.push(`currency IN (${placeholders})`);
    params.push(...filter.currencies);
  } else if (filter.currency) {
    conditions.push('currency = ?');
    params.push(filter.currency);
  }
  if (filter.tags && filter.tags.length > 0) {
    const parts: string[] = [];
    for (const tag of filter.tags) {
      if (tag === 'investment') {
        parts.push(investmentPurchaseSql());
      } else {
        parts.push('(tag = ? OR (tag IS NULL AND category = ?))');
        params.push(tag, tag);
      }
    }
    conditions.push(`(${parts.join(' OR ')})`);
  } else if (filter.tag === '__none__') {
    conditions.push('(tag IS NULL AND (category IS NULL OR category = ""))');
  } else if (filter.tag) {
    if (filter.tag === 'investment') {
      conditions.push(investmentPurchaseSql());
    } else {
      conditions.push('(tag = ? OR (tag IS NULL AND category = ?))');
      params.push(filter.tag, filter.tag);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

export function mapDbRowToTransaction(r: Record<string, unknown>): UnifiedTransaction {
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
    categoryLocked:  Boolean(r.category_locked),
    mcc:             (r.mcc as number | null) ?? undefined,
    counterparty:    (r.counterparty as string | null) ?? undefined,
    directionFrom:   (r.direction_from as string | null) ?? undefined,
    directionTo:     (r.direction_to as string | null) ?? undefined,
    transactionDate: r.transaction_date as number,
    importedAt:      r.imported_at as number,
    rawPayload:      (r.raw_payload as string | null) ?? undefined,
  };
}

const rowToTx = mapDbRowToTransaction;

function normalizeExternalId(externalId?: string | null): string | null {
  const v = externalId?.trim();
  return v ? v : null;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  recentTransactions: [],
  totalCount: 0,
  hasMore: false,
  isLoading: false,
  filter: {},
  dataVersion: 0,

  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),

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
      const { where, params } = buildWhere(activeFilter);
      const countRow = db.getFirstSync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM transactions ${where}`,
        params,
      );
      const rows = db.getAllSync<Record<string, unknown>>(
        `SELECT * FROM transactions ${where} ORDER BY transaction_date DESC LIMIT ?`,
        [...params, PAGE_SIZE],
      );
      const transactions = rows.map(rowToTx);
      const totalCount = countRow?.cnt ?? transactions.length;
      set({
        transactions,
        totalCount,
        hasMore: transactions.length < totalCount,
        isLoading: false,
        dataVersion: get().dataVersion + 1,
      });
    } catch (e) {
      console.error('[transactionsSlice] loadTransactions error:', e);
      set({ isLoading: false });
    }
  },

  loadMoreTransactions: () => {
    const { filter, transactions, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;

    try {
      const db = getDatabase();
      const { where, params } = buildWhere(filter);
      const rows = db.getAllSync<Record<string, unknown>>(
        `SELECT * FROM transactions ${where} ORDER BY transaction_date DESC LIMIT ? OFFSET ?`,
        [...params, PAGE_SIZE, transactions.length],
      );
      const more = rows.map(rowToTx);
      const next = [...transactions, ...more];
      set({
        transactions: next,
        hasMore: next.length < get().totalCount && more.length > 0,
      });
    } catch (e) {
      console.error('[transactionsSlice] loadMoreTransactions error:', e);
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

  upsertTransactions: (txs, opts) => {
    const db = getDatabase();
    let inserted = 0;
    let updated = 0;
    const forceInsert = opts?.forceInsert === true;

    const existingFpRows = forceInsert
      ? []
      : db.getAllSync<{
        id: string;
        account_id: string;
        platform: string;
        transaction_date: number;
        amount: number;
        currency: string;
        description: string | null;
        category_locked: number | null;
        tag: string | null;
        category: string | null;
      }>(
        `SELECT id, account_id, platform, transaction_date, amount, currency, description,
                category_locked, tag, category
         FROM transactions`,
      );
    const fpToExisting = new Map<string, {
      id: string;
      category_locked: number | null;
      tag: string | null;
      category: string | null;
    }>();
    for (const row of existingFpRows) {
      const meta = {
        id: row.id,
        category_locked: row.category_locked,
        tag: row.tag,
        category: row.category,
      };
      const fp = makeTransactionFingerprint(
        row.account_id,
        row.platform as UnifiedTransaction['platform'],
        row.transaction_date,
        row.amount,
        row.currency,
        row.description ?? undefined,
      );
      if (!fpToExisting.has(fp)) fpToExisting.set(fp, meta);
    }

    const findByExternal = db.prepareSync(
      `SELECT id, category_locked, tag, category FROM transactions
       WHERE platform = ? AND external_id = ? LIMIT 1`,
    );
    const findById = db.prepareSync(
      `SELECT id, category_locked, tag, category FROM transactions WHERE id = ? LIMIT 1`,
    );
    const updateStmt = db.prepareSync(
      `UPDATE transactions SET
         account_id = ?, type = ?, amount = ?, currency = ?,
         amount_base = ?, exchange_rate = ?, fee_amount = ?, fee_currency = ?, fee_type = ?,
         description = ?, category = ?, tag = ?, mcc = ?, counterparty = ?,
         direction_from = ?, direction_to = ?, transaction_date = ?, imported_at = ?, raw_payload = ?,
         external_id = ?
       WHERE id = ?`,
    );
    const insertStmt = db.prepareSync(
      `INSERT INTO transactions
       (id, account_id, platform, external_id, type, amount, currency,
        amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
        description, category, tag, category_locked, mcc, counterparty, direction_from, direction_to,
        transaction_date, imported_at, raw_payload)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?)`,
    );

    try {
      db.withTransactionSync(() => {
        for (const tx of txs) {
          try {
            const externalId = normalizeExternalId(tx.externalId);
            const fp = makeTransactionFingerprint(
              tx.accountId, tx.platform, tx.transactionDate, tx.amount, tx.currency, tx.description,
            );
            let existing: {
              id: string;
              category_locked: number | null;
              tag: string | null;
              category: string | null;
            } | null = null;

            // forceInsert: never merge by fingerprint — always create a new row
            // (ids/externalIds already reassigned by the import caller)
            if (!forceInsert) {
              if (externalId) {
                existing = findByExternal.executeSync<{
                  id: string;
                  category_locked: number | null;
                  tag: string | null;
                  category: string | null;
                }>(tx.platform, externalId).getFirstSync() ?? null;
              }
              if (!existing) {
                existing = findById.executeSync<{
                  id: string;
                  category_locked: number | null;
                  tag: string | null;
                  category: string | null;
                }>(tx.id).getFirstSync() ?? null;
              }
              if (!existing) {
                existing = fpToExisting.get(fp) ?? null;
              }
            }

            if (existing) {
              const locked = Boolean(existing.category_locked);
              const tag = locked ? existing.tag : (tx.tag ?? null);
              const category = locked ? existing.category : (tx.category ?? null);
              updateStmt.executeSync([
                tx.accountId, tx.type, tx.amount, tx.currency,
                tx.amountBase ?? null, tx.exchangeRate ?? null,
                tx.feeAmount, tx.feeCurrency ?? null, tx.feeType ?? null,
                tx.description ?? null, category, tag, tx.mcc ?? null,
                tx.counterparty ?? null, tx.directionFrom ?? null, tx.directionTo ?? null,
                tx.transactionDate, tx.importedAt, tx.rawPayload ?? null,
                externalId, existing.id,
              ]);
              updated++;
              const meta = { ...existing, tag, category };
              fpToExisting.set(fp, meta);
            } else {
              insertStmt.executeSync([
                tx.id, tx.accountId, tx.platform, externalId,
                tx.type, tx.amount, tx.currency,
                tx.amountBase ?? null, tx.exchangeRate ?? null,
                tx.feeAmount, tx.feeCurrency ?? null, tx.feeType ?? null,
                tx.description ?? null, tx.category ?? null, tx.tag ?? null,
                tx.mcc ?? null, tx.counterparty ?? null, tx.directionFrom ?? null, tx.directionTo ?? null,
                tx.transactionDate, tx.importedAt, tx.rawPayload ?? null,
              ]);
              inserted++;
              const meta = {
                id: tx.id,
                category_locked: 0,
                tag: tx.tag ?? null,
                category: tx.category ?? null,
              };
              fpToExisting.set(fp, meta);
            }
          } catch (e) {
            console.warn('[transactionsSlice] skip upsert:', tx.id, e);
          }
        }
      });
    } finally {
      findByExternal.finalizeSync();
      findById.finalizeSync();
      updateStmt.finalizeSync();
      insertStmt.finalizeSync();
    }

    if (inserted > 0 || updated > 0) markBalancesDirty();
    get().loadTransactions();
    get().loadRecentTransactions();
    return { inserted, updated, total: txs.length };
  },

  updateTransactionTag: (id, tag, category) => {
    try {
      const db = getDatabase();
      const cat = category !== undefined ? category : tag;
      db.runSync(
        'UPDATE transactions SET tag = ?, category = ?, category_locked = 1 WHERE id = ?',
        [tag, cat, id],
      );
      const patch = (tx: UnifiedTransaction) =>
        tx.id === id
          ? {
              ...tx,
              tag: tag ?? undefined,
              category: (cat ?? undefined) as string | undefined,
              categoryLocked: true,
            }
          : tx;
      set((state) => ({
        transactions: state.transactions.map(patch),
        recentTransactions: state.recentTransactions.map(patch),
        dataVersion: state.dataVersion + 1,
      }));
    } catch (e) {
      console.error('[transactionsSlice] updateTransactionTag error:', e);
    }
  },

  unlockAndSetCategory: (id, tag, category) => {
    try {
      const db = getDatabase();
      db.runSync(
        'UPDATE transactions SET tag = ?, category = ?, category_locked = 0 WHERE id = ?',
        [tag, category, id],
      );
      const patch = (tx: UnifiedTransaction) =>
        tx.id === id
          ? { ...tx, tag, category, categoryLocked: false }
          : tx;
      set((state) => ({
        transactions: state.transactions.map(patch),
        recentTransactions: state.recentTransactions.map(patch),
        dataVersion: state.dataVersion + 1,
      }));
    } catch (e) {
      console.error('[transactionsSlice] unlockAndSetCategory error:', e);
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadTransactions(filter);
  },
}));
