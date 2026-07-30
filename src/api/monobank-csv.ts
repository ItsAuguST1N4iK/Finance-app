/**
 * Monobank CSV export parser
 *
 * Export format from monobank.ua → Виписка → Завантажити CSV
 * Header includes account currency, e.g. `Card currency amount, (EUR)`.
 */

import Papa from 'papaparse';
import type { Account, UnifiedTransaction } from '../types';
import { makeStableTransactionIds } from '../utils/dedup';
import { parseAmount } from '../utils/parseAmount';
import { buildOwnAccountContext, isSelfTransfer } from '../utils/selfTransfer';
import { resolveImportCategory, categoryFields } from '../utils/categoryDetect';
import { peekMonobankStatementCurrency } from '../utils/statementCurrency';

export type MonoCsvCurrencyMode = 'auto' | 'account' | 'operation';

export interface MonoCsvImportOptions {
  /** Which amount/currency columns to use from the CSV */
  currencyMode: MonoCsvCurrencyMode;
  /** Currency of the linked account (e.g. EUR, UAH). Prefer header detection. */
  accountCurrency: string;
}

function parseMonoDate(s: string): number {
  const [datePart, timePart] = s.trim().split(' ');
  if (!datePart) return Date.now();
  const [dd, mm, yyyy] = datePart.split('.').map(Number);
  const [hh, min, sec] = (timePart ?? '00:00:00').split(':').map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min, sec).getTime();
}

export interface MonoCsvImportResult {
  transactions: UnifiedTransaction[];
  /** Detected from header `Card currency amount, (EUR)` etc. */
  accountCurrency: string;
}

export function parseMonobankCsv(
  csvContent: string,
  internalAccountId: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
  options: Partial<MonoCsvImportOptions> = {},
  onProgress?: (current: number, total: number) => void,
): MonoCsvImportResult {
  const result = Papa.parse<string[]>(csvContent.trim(), {
    skipEmptyLines: true,
  });

  const rows = result.data as string[][];
  if (rows.length < 2) {
    return {
      transactions: [],
      accountCurrency: options.accountCurrency || 'UAH',
    };
  }

  const headerCurrency = peekMonobankStatementCurrency('', csvContent) || undefined;
  const accountCurrency = (
    options.accountCurrency
    || headerCurrency
    || 'UAH'
  ).toUpperCase();
  const currencyMode: MonoCsvCurrencyMode = options.currencyMode ?? 'auto';

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  const dataRows = rows.slice(1);
  const transactions: UnifiedTransaction[] = [];
  const total = dataRows.length;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (onProgress && (i % 25 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
    }
    if (row.length < 4) continue;

    const [
      dateStr, description, mccStr,
      cardAmountStr, opAmountStr, opCurrency,
      exchangeRateStr, commissionStr,
    ] = row;

    const cardAmount = parseAmount(cardAmountStr);
    const opAmount = parseAmount(opAmountStr);
    const mcc = parseInt(mccStr ?? '0', 10) || undefined;
    const commission = Math.abs(parseAmount(commissionStr));

    if (cardAmount === 0 && opAmount === 0) continue;

    const date = parseMonoDate(dateStr ?? '');
    const desc = description?.trim();

    const opCurRaw = opCurrency?.trim();
    const hasOpCurrency = !!(opCurRaw && opCurRaw !== '—' && opCurRaw !== '-');

    let amount: number;
    let currency: string;

    /**
     * auto / account → always statement (card) column + statement currency.
     * Monobank shows card-currency as primary on each statement; op is the other leg.
     * Preferring op under "auto" previously stored UAH amounts labeled as EUR after repair.
     */
    if (currencyMode === 'operation' && hasOpCurrency) {
      amount = Math.abs(opAmount || cardAmount);
      currency = opCurRaw!.toUpperCase();
    } else {
      amount = Math.abs(cardAmount || opAmount);
      currency = accountCurrency;
    }

    const isCancellation = /^Cancellation\.|^Скасування\./i.test(desc ?? '');
    const baseType: UnifiedTransaction['type'] = cardAmount > 0 ? 'income' : 'expense';
    const effectiveType: UnifiedTransaction['type'] = isCancellation ? 'income' : baseType;

    const self = isSelfTransfer(desc, undefined, undefined, ctx);
    const type = self ? 'transfer' : effectiveType;
    const catKey = resolveImportCategory({
      mcc,
      description: desc,
      ownIbans,
      ownAccounts,
      amount,
      platform: 'monobank',
      type,
      currency,
      selfTransfer: self,
    });
    const { tag, category } = categoryFields(catKey);

    const { id, externalId } = makeStableTransactionIds(
      internalAccountId, 'monobank', date, amount, currency, desc,
    );

    transactions.push({
      id,
      accountId: internalAccountId,
      platform: 'monobank',
      externalId,
      type,
      amount,
      currency,
      feeAmount: commission,
      description: desc || undefined,
      mcc,
      tag: tag ?? undefined,
      category,
      transactionDate: date,
      importedAt: Date.now(),
      rawPayload: JSON.stringify({
        cardAmount,
        opAmount,
        opCurrency: opCurRaw,
        accountCurrency,
        exchangeRate: exchangeRateStr,
        currencyMode,
        headerCurrency: headerCurrency ?? null,
      }),
    });
  }

  return { transactions, accountCurrency };
}
