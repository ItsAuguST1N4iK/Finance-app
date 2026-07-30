import { useState, useCallback } from 'react';
import { tokenStore, TOKEN_KEYS } from '../../security/tokenStore';
import { useAccountsStore } from '../../store/accountsSlice';
import { useAppProgressStore } from '../../store/appProgressSlice';
import {
  fetchMonoClientInfo,
  fetchMonoStatement,
  monoStatementToTx,
  SyncProgress,
} from '../../api/monobank';
import { fetchIBKRFlexReport } from '../../api/ibkr';
import { refreshAppData } from '../../services/refreshAppData';
import { enqueueImportJob } from '../../services/importJobQueue';
import { confirmImportTransactions, type AlertShow } from '../../utils/importTransactions';
import { applyLiveBalances } from '../../utils/accountBalance';
import type { Account, UnifiedTransaction } from '../../types';
import type { Language } from '../../i18n';
import type { DupConfirmShow } from '../../hooks/useImportDuplicatesConfirm';

type UpsertFn = (txs: UnifiedTransaction[]) => { inserted: number; updated?: number; total: number };
type ShowImportResult = (label: string, result: { inserted: number; updated?: number }) => void;

interface PlatformSyncDeps {
  accounts: Account[];
  language: Language;
  show: AlertShow;
  t: {
    settingsTokenMissing: string;
    settingsTokenMissingHint: string;
    settingsMonoConnecting: string;
    settingsMonoRateLimit: string;
    settingsMonoPause: string;
    settingsMonoSyncDone: string;
    settingsMonoSyncNoNew: string;
    settingsIbkrConnecting: string;
    settingsIbkrGenerating: string;
    settingsIbkrSyncDone: string;
    settingsIbkrSyncNoNew: string;
    settingsSyncError: string;
    done: string;
    importDuplicatesMessage: string;
    importDuplicatesTitle: string;
    importRejectDuplicates: string;
    importAddAnyway: string;
    importCancelImport: string;
    importAddWithoutDuplicates: string;
    importAddWithDuplicates: string;
  };
  upsertTransactions: UpsertFn;
  showImportResult: ShowImportResult;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => Account;
  loadAccounts: (force?: boolean) => void;
  updateBalance: (id: string, balance: number) => void;
  showDupConfirm: DupConfirmShow;
}

export function usePlatformSync({
  accounts,
  language,
  show,
  t,
  upsertTransactions,
  showImportResult,
  addAccount,
  loadAccounts,
  updateBalance,
  showDupConfirm,
}: PlatformSyncDeps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgressLocal] = useState<SyncProgress | null>(null);
  const dateLocale = language === 'en' ? 'en-US' : 'uk-UA';

  const setProgress = useCallback((p: SyncProgress | null) => {
    setProgressLocal(p);
    if (p) useAppProgressStore.getState().setProgress(p);
    else useAppProgressStore.getState().clearProgress(0);
  }, []);

  const syncMonobank = useCallback(async () => {
    const token = await tokenStore.get(TOKEN_KEYS.monobank);
    if (!token) { show(t.settingsTokenMissing, t.settingsTokenMissingHint); return; }

    setSyncing(true);
    setProgress({ step: t.settingsMonoConnecting, current: 0, total: 1 });

    try {
      const { accounts: monoAccounts } = await fetchMonoClientInfo(token);
      const ownIbans = [
        ...monoAccounts.map((ma) => ma.raw.iban).filter(Boolean) as string[],
        ...accounts.filter((a) => a.iban).map((a) => a.iban!),
      ];

      const nowSec  = Math.floor(Date.now() / 1000);
      const fromSec = nowSec - 90 * 24 * 60 * 60;
      const MAX_WIN = 30 * 24 * 60 * 60;
      const windows: Array<{ from: number; to: number }> = [];
      for (let ts = fromSec; ts < nowSec; ts += MAX_WIN) {
        windows.push({ from: ts, to: Math.min(ts + MAX_WIN, nowSec) });
      }
      const total = monoAccounts.length * windows.length;
      let done = 0;
      const allTxs: UnifiedTransaction[] = [];

      const liveBalances: Array<{ accountId: string; balance: number }> = [];

      for (const { raw, account } of monoAccounts) {
        const existingAcc = accounts.find((a) => a.externalId === raw.id);
        let internalId = existingAcc?.id;
        if (!existingAcc) {
          const created = addAccount(account);
          internalId = created.id;
          loadAccounts();
        } else {
          updateBalance(existingAcc.id, account.balance ?? 0);
          internalId = existingAcc.id;
        }
        if (!internalId) continue;
        if (account.balance != null) {
          liveBalances.push({ accountId: internalId, balance: account.balance });
        }

        for (const win of windows) {
          done++;
          setProgress({
            step:    `${account.name} · ${new Date(win.from * 1000).toLocaleDateString(dateLocale)}`,
            current: done, total,
          });

          let retryWindow = false;
          do {
            retryWindow = false;
            try {
              const stmts = await fetchMonoStatement(token, raw.id, win.from, win.to);
              const txs   = stmts.map((s) => monoStatementToTx(s, internalId!, ownIbans, accounts));
              if (txs.length > 0) allTxs.push(...txs);
            } catch (e: unknown) {
              if ((e as Error)?.message === 'rate_limit') {
                setProgress({ step: t.settingsMonoRateLimit, current: done, total });
                await new Promise((r) => setTimeout(r, 65_000));
                retryWindow = true;
                setProgress({
                  step:    `${account.name} · ${new Date(win.from * 1000).toLocaleDateString(dateLocale)}`,
                  current: done, total,
                });
              } else {
                console.warn('[mono sync]', e);
              }
            }
          } while (retryWindow);

          if (done < total) {
            setProgress({ step: t.settingsMonoPause, current: done, total });
            await new Promise((r) => setTimeout(r, 62_000));
          }
        }
      }
      setProgress({ step: t.settingsMonoSyncDone, current: total, total });
      if (allTxs.length > 0) {
        // Hand off to the non-blocking import queue (retag at end)
        setProgress(null);
        const balancesToApply = liveBalances;
        enqueueImportJob(
          {
            label: 'Monobank',
            kind: 'scraper',
            run: async (onProgress) => {
              onProgress(allTxs.length, allTxs.length, 'save');
              await confirmImportTransactions(
                'Monobank', allTxs, upsertTransactions, showImportResult, showDupConfirm, t,
              );
              // Tx-sum / statement may be incomplete — restore live client-info balances
              loadAccounts(true);
              applyLiveBalances(balancesToApply);
              loadAccounts(true);
            },
          },
          { scheduleRetag: true, accounts: useAccountsStore.getState().accounts },
        );
      } else {
        applyLiveBalances(liveBalances);
        await refreshAppData('analytics');
        show(t.done, t.settingsMonoSyncNoNew);
      }
    } catch (e: unknown) {
      show(t.settingsSyncError, String((e as Error)?.message ?? e));
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(null), 3000);
      loadAccounts(true);
    }
  }, [accounts, language, show, t, upsertTransactions, showImportResult, addAccount, loadAccounts, updateBalance, dateLocale, showDupConfirm, setProgress]);

  const syncIBKR = useCallback(async () => {
    const token = (await tokenStore.get(TOKEN_KEYS.ibkrFlexToken))?.trim();
    const queryId = (await tokenStore.get(TOKEN_KEYS.ibkrQueryId))?.trim();
    if (!token || !queryId) {
      show(t.settingsTokenMissing, t.settingsTokenMissingHint);
      return;
    }

    setSyncing(true);
    setProgress({ step: t.settingsIbkrConnecting, current: 0, total: 2 });

    try {
      const { transactions, accounts: ibkrAccounts } = await fetchIBKRFlexReport(
        token,
        queryId,
        (p) => setProgress({
          step: p.step === 'GetStatement' ? t.settingsIbkrGenerating : p.step,
          current: p.current,
          total: p.total,
        }),
      );

      const extToInternal = new Map<string, string>();
      let currentAccounts = accounts;

      for (const acc of ibkrAccounts) {
        let existing = currentAccounts.find((a) => a.externalId === acc.externalId && a.platform === 'ibkr');
        if (!existing) {
          addAccount(acc);
          loadAccounts();
          currentAccounts = useAccountsStore.getState().accounts;
          existing = currentAccounts.find((a) => a.externalId === acc.externalId && a.platform === 'ibkr');
        }
        if (existing?.externalId) extToInternal.set(existing.externalId, existing.id);
      }

      const mappedTxs = transactions
        .map((tx) => {
          const internalId = extToInternal.get(tx.accountId);
          return internalId ? { ...tx, accountId: internalId } : null;
        })
        .filter((tx): tx is UnifiedTransaction => tx != null);

      setProgress({ step: t.settingsIbkrSyncDone, current: 2, total: 2 });
      if (mappedTxs.length > 0) {
        setProgress(null);
        enqueueImportJob(
          {
            label: 'IBKR',
            kind: 'scraper',
            run: async (onProgress) => {
              onProgress(mappedTxs.length, mappedTxs.length, 'save');
              await confirmImportTransactions(
                'IBKR', mappedTxs, upsertTransactions, showImportResult, showDupConfirm, t,
              );
            },
          },
          { scheduleRetag: true, accounts: useAccountsStore.getState().accounts },
        );
      } else {
        await refreshAppData('analytics');
        show(t.done, t.settingsIbkrSyncNoNew);
      }
    } catch (e: unknown) {
      show(t.settingsSyncError, String((e as Error)?.message ?? e));
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(null), 3000);
      loadAccounts();
    }
  }, [accounts, show, t, upsertTransactions, showImportResult, addAccount, loadAccounts, showDupConfirm, setProgress]);

  return { syncMonobank, syncIBKR, syncing, progress, setSyncing, setProgress };
}
