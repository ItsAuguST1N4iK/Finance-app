import * as FileSystem from 'expo-file-system/legacy';
import { parseZenCsv } from '../../api/zen';
import { parseMonobankCsv, type MonoCsvCurrencyMode } from '../../api/monobank-csv';
import { parsePrivatbankXlsx, parsePrivatbankCsv } from '../../api/privatbank';
import { parseIbkrTradeHistoryCsv } from '../../api/ibkr-csv';
import { repairIbkrInvestments } from '../../utils/repairIbkr';
import { repairCurrencyMismatches } from '../../utils/repairCurrency';
import { refreshAppData } from '../../services/refreshAppData';
import { enqueueImportJob } from '../../services/importJobQueue';
import { confirmImportTransactions, type AlertShow } from '../../utils/importTransactions';
import { base64ToArrayBuffer } from '../../utils/fileBinary';
import { ensureImportAccount } from '../../utils/ensureImportAccount';
import {
  peekIbkrStatementCurrency,
  peekMonobankStatementCurrency,
} from '../../utils/statementCurrency';
import type { Account, UnifiedTransaction } from '../../types';
import { useAccountsStore } from '../../store/accountsSlice';

type UpsertFn = (
  txs: UnifiedTransaction[],
  opts?: { forceInsert?: boolean },
) => { inserted: number; updated?: number; total: number };

interface CsvImportDeps {
  accounts: Account[];
  show: AlertShow;
  t: {
    importCsvSuccess: string;
    importCsvImportedTitle: string;
    importCsvNoTx: string;
    importCsvError: string;
    importDuplicatesMessage: string;
    importDuplicatesTitle: string;
    importRejectDuplicates: string;
    importAddAnyway: string;
    importCancelImport: string;
    importAddWithoutDuplicates: string;
    importAddWithDuplicates: string;
    appProgressImport: string;
  };
  upsertTransactions: UpsertFn;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => Account;
  loadAccounts: () => void;
  showDupConfirm: import('../../hooks/useImportDuplicatesConfirm').DupConfirmShow;
}

function peekZenMeta(content: string): { iban?: string; currency: string } {
  let iban: string | undefined;
  let currency = 'EUR';
  const ibanMatch = content.match(/Local IBAN\/Account Number:\s*([A-Z0-9]+)/);
  if (ibanMatch) iban = ibanMatch[1].trim();
  const currencyMatch = content.match(/^Currency:\s*([A-Z]+)/m);
  if (currencyMatch) currency = currencyMatch[1].trim();
  return { iban, currency };
}

function peekPrivatCardFromCsv(content: string): { cardNumber?: string; currency: string } {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(2, 12)) {
    const cols = line.split(';');
    if (cols.length < 6) continue;
    const cardNumber = cols[2]?.trim();
    const currency = cols[5]?.trim() || 'UAH';
    if (cardNumber || currency) return { cardNumber: cardNumber || undefined, currency };
  }
  return { currency: 'UAH' };
}

function peekPrivatCardFromXlsx(buffer: ArrayBuffer): { cardNumber?: string; currency: string } {
  const peek = parsePrivatbankXlsx(buffer, '__peek__', [], []);
  return {
    cardNumber: peek.cardNumber || undefined,
    currency: peek.currency || 'UAH',
  };
}

function privatDisplayName(cardNumber: string | undefined, currency: string): string {
  if (!cardNumber) return `PrivatBank ${currency}`;
  const digits = cardNumber.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return last4 ? `PrivatBank ****${last4}` : `PrivatBank ${currency}`;
}

export function useCsvImportHandlers({
  accounts,
  show,
  t,
  upsertTransactions,
  loadAccounts,
  showDupConfirm,
}: CsvImportDeps) {
  function showImportResult(label: string, result: { inserted: number; updated?: number }) {
    if (label.startsWith('IBKR')) repairIbkrInvestments();
    repairCurrencyMismatches();
    const saved = result.inserted + (result.updated ?? 0);
    if (saved > 0) {
      const msg = t.importCsvSuccess.replace('{count}', String(saved));
      show(t.importCsvImportedTitle.replace('{label}', label), msg);
      void refreshAppData('all');
    } else {
      show(label, t.importCsvNoTx);
    }
  }

  function queueScraper(
    label: string,
    run: (onProgress: (current: number, total: number, detail?: string) => void) => Promise<void>,
  ) {
    enqueueImportJob(
      { label, kind: 'scraper', run },
      { scheduleRetag: true, accounts: useAccountsStore.getState().accounts },
    );
  }

  function handleZenImport(uri: string, _name: string, accountId: string) {
    queueScraper('ZEN', async (onProgress) => {
      try {
        onProgress(0, 1, 'read');
        const content = await FileSystem.readAsStringAsync(uri);
        const meta = peekZenMeta(content);
        const account = ensureImportAccount('zen', {
          preferredId: accountId,
          iban: meta.iban,
          currency: meta.currency,
          name: meta.iban ? `ZEN ${meta.iban.slice(-4)}` : `ZEN ${meta.currency}`,
        });
        loadAccounts();

        const ownIbans = useAccountsStore.getState().accounts
          .filter((a) => a.iban)
          .map((a) => a.iban!);
        const { transactions } = parseZenCsv(
          content,
          account.id,
          ownIbans,
          useAccountsStore.getState().accounts,
        );
        onProgress(transactions.length, Math.max(1, transactions.length), 'parse');
        if (transactions.length > 0) {
          await confirmImportTransactions(
            'ZEN', transactions, upsertTransactions, showImportResult, showDupConfirm, t,
          );
        } else {
          show('ZEN', t.importCsvNoTx);
        }
      } catch (e) {
        show(t.importCsvError, String((e as Error)?.message ?? e));
        throw e;
      }
    });
  }

  function handleMonoCsvImport(
    uri: string,
    name: string,
    accountId: string,
    options?: { currencyMode: MonoCsvCurrencyMode },
  ) {
    queueScraper('Monobank CSV', async (onProgress) => {
      try {
        onProgress(0, 1, 'read');
        const content = await FileSystem.readAsStringAsync(uri);
        const preferred = accounts.find((a) => a.id === accountId);
        const fileCurrency = peekMonobankStatementCurrency(name, content);
        const currency = (fileCurrency ?? preferred?.currency ?? 'UAH').toUpperCase();

        const account = ensureImportAccount('monobank', {
          preferredId: accountId,
          currency,
          name: preferred && preferred.currency?.toUpperCase() === currency
            ? undefined
            : `Monobank ${currency}`,
        });
        loadAccounts();

        const currencyMode = options?.currencyMode ?? 'auto';
        const ownIbans = useAccountsStore.getState().accounts
          .filter((a) => a.iban)
          .map((a) => a.iban!);

        const { transactions } = parseMonobankCsv(
          content,
          account.id,
          ownIbans,
          useAccountsStore.getState().accounts,
          { currencyMode, accountCurrency: currency },
          (current, total) => onProgress(current, total, 'parse'),
        );

        onProgress(transactions.length, Math.max(1, transactions.length), 'save');
        if (transactions.length > 0) {
          await confirmImportTransactions(
            'Monobank CSV', transactions, upsertTransactions, showImportResult, showDupConfirm, t,
          );
        } else {
          show('Monobank CSV', t.importCsvNoTx);
        }
      } catch (e) {
        show(t.importCsvError, String((e as Error)?.message ?? e));
        throw e;
      }
    });
  }

  function handlePrivatImport(uri: string, name: string, accountId: string) {
    queueScraper('PrivatBank', async (onProgress) => {
      try {
        onProgress(0, 1, 'read');
        const ownAccounts = () => useAccountsStore.getState().accounts;
        const ownIbans = () => ownAccounts().filter((a) => a.iban).map((a) => a.iban!);

        const isXlsx = name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls');
        let meta: { cardNumber?: string; currency: string };
        let buffer: ArrayBuffer | null = null;
        let csvContent: string | null = null;

        if (isXlsx) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          buffer = base64ToArrayBuffer(base64);
          meta = peekPrivatCardFromXlsx(buffer);
        } else {
          csvContent = await FileSystem.readAsStringAsync(uri);
          meta = peekPrivatCardFromCsv(csvContent);
        }

        const account = ensureImportAccount('privatbank', {
          preferredId: accountId,
          currency: meta.currency,
          name: privatDisplayName(meta.cardNumber, meta.currency),
          externalId: meta.cardNumber?.replace(/\s/g, '') || undefined,
        });
        loadAccounts();

        let transactions: UnifiedTransaction[] = [];
        if (isXlsx && buffer) {
          transactions = parsePrivatbankXlsx(buffer, account.id, ownIbans(), ownAccounts()).transactions;
        } else if (csvContent) {
          transactions = parsePrivatbankCsv(csvContent, account.id, ownIbans(), ownAccounts()).transactions;
        }

        onProgress(transactions.length, Math.max(1, transactions.length), 'parse');
        if (transactions.length > 0) {
          await confirmImportTransactions(
            'PrivatBank', transactions, upsertTransactions, showImportResult, showDupConfirm, t,
          );
        } else {
          show('PrivatBank', t.importCsvNoTx);
        }
      } catch (e) {
        show(t.importCsvError, String((e as Error)?.message ?? e));
        throw e;
      }
    });
  }

  function handleIbkrCsvImport(uri: string, name: string, accountId: string) {
    if (name.toLowerCase().endsWith('.pdf')) {
      show(t.importCsvError, 'PDF не підтримується. Експортуйте Trade History у CSV з Client Portal.');
      return;
    }
    queueScraper('IBKR CSV', async (onProgress) => {
      try {
        onProgress(0, 1, 'read');
        const content = await FileSystem.readAsStringAsync(uri);
        const fileCurrency = peekIbkrStatementCurrency(name, content);
        const preferred = ensureImportAccount('ibkr', {
          preferredId: accountId,
          currency: fileCurrency,
          name: `IBKR ${fileCurrency}`,
        });

        const { transactions, accounts: ibkrAccounts } = parseIbkrTradeHistoryCsv(content, preferred.id);

        const extToInternal = new Map<string, string>();
        for (const acc of ibkrAccounts) {
          const ensured = ensureImportAccount('ibkr', {
            externalId: acc.externalId,
            name: acc.name,
            currency: acc.currency || fileCurrency,
          });
          if (acc.externalId) extToInternal.set(acc.externalId, ensured.id);
        }
        if (extToInternal.size === 0) {
          extToInternal.set('ibkr', preferred.id);
        }
        loadAccounts();

        const mapped = transactions.map((tx) => {
          let ext: string | undefined;
          try {
            const raw = tx.rawPayload ? JSON.parse(tx.rawPayload) as { ibkrAccountId?: string } : {};
            ext = raw.ibkrAccountId;
          } catch { /* ignore */ }
          const resolvedId = (ext && extToInternal.get(ext)) || preferred.id;
          return resolvedId === tx.accountId ? tx : { ...tx, accountId: resolvedId };
        });

        onProgress(mapped.length, Math.max(1, mapped.length), 'parse');
        if (mapped.length > 0) {
          await confirmImportTransactions(
            'IBKR CSV', mapped, upsertTransactions, showImportResult, showDupConfirm, t,
          );
        } else {
          show('IBKR CSV', t.importCsvNoTx);
        }
      } catch (e) {
        show(t.importCsvError, String((e as Error)?.message ?? e));
        throw e;
      }
    });
  }

  return {
    showImportResult,
    handleZenImport,
    handleMonoCsvImport,
    handlePrivatImport,
    handleIbkrCsvImport,
  };
}
