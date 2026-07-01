import { create } from 'zustand';
import type { Account } from '../types';
import { getDatabase } from '../db/migrations';

/**
 * Slice рахунків у Zustand.
 *
 * Zustand працює так:
 * - стан і методи описані в одному об'єкті
 * - будь-який компонент може підписатися через useAccountsStore()
 * - зміна стану → автоматичний ре-рендер підписаних компонентів
 */

interface AccountsState {
  accounts: Account[];
  isLoading: boolean;

  /** Завантажити всі рахунки з SQLite */
  loadAccounts: () => void;

  /** Додати новий рахунок */
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;

  /** Оновити баланс рахунку */
  updateBalance: (accountId: string, balance: number) => void;

  /** Видалити рахунок (м'яке видалення — is_active = 0) */
  deactivateAccount: (accountId: string) => void;
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  isLoading: false,

  loadAccounts: () => {
    set({ isLoading: true });
    try {
      const db = getDatabase();
      const rows = db.getAllSync<Account & {
        is_active: number;
        external_id: string | null;
        created_at: number;
      }>(
        `SELECT id, platform, name, currency, iban, external_id, balance, is_active, created_at
         FROM accounts WHERE is_active = 1 ORDER BY created_at ASC`
      );

      // Перетворюємо snake_case з SQLite на camelCase TypeScript
      const accounts: Account[] = rows.map((r) => ({
        id: r.id,
        platform: r.platform,
        name: r.name,
        currency: r.currency,
        iban: r.iban ?? undefined,
        externalId: r.external_id ?? undefined,
        balance: r.balance ?? undefined,
        isActive: r.is_active === 1,
        createdAt: r.created_at,
      }));

      set({ accounts, isLoading: false });
    } catch (e) {
      console.error('[accountsSlice] loadAccounts error:', e);
      set({ isLoading: false });
    }
  },

  addAccount: (data) => {
    const db = getDatabase();
    const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    db.runSync(
      `INSERT INTO accounts (id, platform, name, currency, iban, external_id, balance, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, data.platform, data.name, data.currency, data.iban ?? null,
       data.externalId ?? null, data.balance ?? null, now]
    );

    const newAccount: Account = { ...data, id, isActive: true, createdAt: now };
    set((state) => ({ accounts: [...state.accounts, newAccount] }));
  },

  updateBalance: (accountId, balance) => {
    const db = getDatabase();
    db.runSync(`UPDATE accounts SET balance = ? WHERE id = ?`, [balance, accountId]);
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === accountId ? { ...a, balance } : a
      ),
    }));
  },

  deactivateAccount: (accountId) => {
    const db = getDatabase();
    db.runSync(`UPDATE accounts SET is_active = 0 WHERE id = ?`, [accountId]);
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== accountId),
    }));
  },
}));
