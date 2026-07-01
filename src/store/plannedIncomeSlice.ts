import { create } from 'zustand';
import type { PlannedIncome, PlannedIncomeStatus } from '../types';
import { getDatabase } from '../db/migrations';

interface PlannedIncomeState {
  items: PlannedIncome[];
  isLoading: boolean;

  loadItems: () => void;

  /** Додати нове планове надходження */
  addItem: (data: Omit<PlannedIncome, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;

  /** Оновити статус (matched, received_manual, overdue, cancelled) */
  updateStatus: (
    id: string,
    status: PlannedIncomeStatus,
    matchedTransactionId?: string
  ) => void;

  /** Видалити / скасувати */
  cancelItem: (id: string) => void;

  /**
   * Перевірити прострочені записи.
   * Викликається при кожному відкритті застосунку.
   */
  checkOverdue: () => void;
}

function rowToItem(r: Record<string, unknown>): PlannedIncome {
  return {
    id:                      r.id as string,
    accountId:               r.account_id as string,
    name:                    r.name as string,
    amount:                  r.amount as number,
    currency:                r.currency as string,
    source:                  (r.source as string | null) ?? undefined,
    notes:                   (r.notes as string | null) ?? undefined,
    expectedDate:            r.expected_date as number,
    notifyDaysBefore:        r.notify_days_before as number,
    recurrence:              r.recurrence as PlannedIncome['recurrence'],
    recurrenceDay:           (r.recurrence_day as number | null) ?? undefined,
    recurrenceIntervalDays:  (r.recurrence_interval_days as number | null) ?? undefined,
    status:                  r.status as PlannedIncomeStatus,
    matchedTransactionId:    (r.matched_transaction_id as string | null) ?? undefined,
    matchedAt:               (r.matched_at as number | null) ?? undefined,
    createdAt:               r.created_at as number,
    updatedAt:               r.updated_at as number,
  };
}

export const usePlannedIncomeStore = create<PlannedIncomeState>((set, get) => ({
  items: [],
  isLoading: false,

  loadItems: () => {
    set({ isLoading: true });
    try {
      const db = getDatabase();
      const rows = db.getAllSync<Record<string, unknown>>(
        `SELECT * FROM planned_income
         WHERE status NOT IN ('cancelled')
         ORDER BY expected_date ASC`
      );
      set({ items: rows.map(rowToItem), isLoading: false });
    } catch (e) {
      console.error('[plannedIncomeSlice] loadItems error:', e);
      set({ isLoading: false });
    }
  },

  addItem: (data) => {
    const db = getDatabase();
    const id = `pi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    db.runSync(
      `INSERT INTO planned_income
       (id, account_id, name, amount, currency, source, notes,
        expected_date, notify_days_before, recurrence, recurrence_day,
        recurrence_interval_days, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
      [
        id, data.accountId, data.name, data.amount, data.currency,
        data.source ?? null, data.notes ?? null,
        data.expectedDate, data.notifyDaysBefore, data.recurrence,
        data.recurrenceDay ?? null, data.recurrenceIntervalDays ?? null,
        now, now,
      ]
    );

    const newItem: PlannedIncome = {
      ...data,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ items: [...state.items, newItem] }));
  },

  updateStatus: (id, status, matchedTransactionId) => {
    const db = getDatabase();
    const now = Date.now();
    db.runSync(
      `UPDATE planned_income SET status = ?, matched_transaction_id = ?, matched_at = ?, updated_at = ?
       WHERE id = ?`,
      [status, matchedTransactionId ?? null, matchedTransactionId ? now : null, now, id]
    );
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status, matchedTransactionId, matchedAt: matchedTransactionId ? now : undefined, updatedAt: now }
          : item
      ),
    }));
  },

  cancelItem: (id) => {
    get().updateStatus(id, 'cancelled');
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  checkOverdue: () => {
    const db = getDatabase();
    const now = Date.now();
    // Позначаємо прострочені: очікувалися більше 3 днів тому
    const overdueThreshold = now - 3 * 24 * 60 * 60 * 1000;
    db.runSync(
      `UPDATE planned_income SET status = 'overdue', updated_at = ?
       WHERE status = 'pending' AND expected_date < ?`,
      [now, overdueThreshold]
    );
    // Оновити стан в пам'яті
    set((state) => ({
      items: state.items.map((item) =>
        item.status === 'pending' && item.expectedDate < overdueThreshold
          ? { ...item, status: 'overdue' as PlannedIncomeStatus, updatedAt: now }
          : item
      ),
    }));
  },
}));
