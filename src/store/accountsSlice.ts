import { create } from 'zustand';
import type { Account } from '../types';
import { getDatabase } from '../db/migrations';

interface AccountsState {
  accounts: Account[];
  isLoading: boolean;

  loadAccounts: () => void;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateBalance: (accountId: string, balance: number) => void;
  updateDisplay: (accountId: string, displayName: string, color?: string) => void;
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
        display_name: string | null;
        color: string | null;
      }>(
        `SELECT id, platform, name, currency, iban, external_id, balance, is_active, created_at,
                display_name, color
         FROM accounts WHERE is_active = 1 ORDER BY created_at ASC`
      );

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
        displayName: r.display_name ?? undefined,
        color: r.color ?? undefined,
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

  updateDisplay: (accountId, displayName, color) => {
    const db = getDatabase();
    if (color !== undefined) {
      db.runSync(
        `UPDATE accounts SET display_name = ?, color = ? WHERE id = ?`,
        [displayName, color, accountId]
      );
    } else {
      db.runSync(
        `UPDATE accounts SET display_name = ? WHERE id = ?`,
        [displayName, accountId]
      );
    }
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === accountId ? { ...a, displayName, ...(color !== undefined ? { color } : {}) } : a
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
