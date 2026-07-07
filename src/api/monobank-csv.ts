/**
 * Monobank CSV export parser
 *
 * Export format from monobank.ua → Виписка → Завантажити CSV
 */

import Papa from 'papaparse';
import type { Account, UnifiedTransaction } from '../types';
import { makeStableTransactionIds } from '../utils/dedup';
import { parseAmount } from '../utils/parseAmount';
import { buildOwnAccountContext, isSelfTransfer } from '../utils/selfTransfer';
import { autoDetectTag } from '../utils/tags';
import { autoDetectCategory } from '../utils/categories';

export type MonoCsvCurrencyMode = 'account' | 'operation';

export interface MonoCsvImportOptions {
  /** Which amount/currency columns to use from the CSV */
  currencyMode: MonoCsvCurrencyMode;
  /** Currency of the linked account (e.g. EUR, UAH) */
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
}

export function parseMonobankCsv(
  csvContent: string,
  internalAccountId: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
  options: MonoCsvImportOptions = { currencyMode: 'account', accountCurrency: 'UAH' },
): MonoCsvImportResult {
  const result = Papa.parse<string[]>(csvContent.trim(), {
    skipEmptyLines: true,
  });

  const rows = result.data as string[][];
  if (rows.length < 2) return { transactions: [] };

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  const dataRows = rows.slice(1);
  const transactions: UnifiedTransaction[] = [];
  const accountCurrency = options.accountCurrency || 'UAH';

  for (const row of dataRows) {
    if (row.length < 4) continue;

    const [
      dateStr, description, mccStr,
      cardAmountStr, opAmountStr, opCurrency,
      exchangeRateStr, commissionStr,
    ] = row;

    const cardAmount = parseAmount(cardAmountStr);
    const opAmount   = parseAmount(opAmountStr);
    const mcc        = parseInt(mccStr ?? '0', 10) || undefined;
    const commission = Math.abs(parseAmount(commissionStr));

    if (cardAmount === 0 && opAmount === 0) continue;

    const date = parseMonoDate(dateStr ?? '');
    const desc = description?.trim();

    const opCurRaw = opCurrency?.trim();
    const hasOpCurrency = !!(opCurRaw && opCurRaw !== '—' && opCurRaw !== '-');

    let amount: number;
    let currency: string;

    if (options.currencyMode === 'operation' && hasOpCurrency) {
      amount = Math.abs(opAmount || cardAmount);
      currency = opCurRaw!;
    } else {
      amount = Math.abs(cardAmount || opAmount);
      currency = accountCurrency;
    }

    const isCancellation = /^Cancellation\./i.test(desc ?? '');
    const baseType: UnifiedTransaction['type'] = cardAmount > 0 ? 'income' : 'expense';
    const effectiveType: UnifiedTransaction['type'] = isCancellation ? 'income' : baseType;

    const self = isSelfTransfer(desc, undefined, undefined, ctx);
    const type = self ? 'transfer' : effectiveType;
    const tag = self
      ? 'self_transfer'
      : autoDetectTag(mcc, desc, ownIbans, undefined, ownAccounts);
    const category = autoDetectCategory(mcc, desc, tag, undefined, ownIbans);

    const { id, externalId } = makeStableTransactionIds(
      internalAccountId, 'monobank', date, amount, currency, desc,
    );

    transactions.push({
      id,
      accountId:       internalAccountId,
      platform:        'monobank',
      externalId,
      type,
      amount,
      currency,
      feeAmount:       commission,
      description:     desc || undefined,
      mcc,
      tag:             tag ?? undefined,
      category,
      transactionDate: date,
      importedAt:      Date.now(),
      rawPayload:      JSON.stringify({
        cardAmount, opAmount, opCurrency: opCurRaw, accountCurrency, exchangeRate: exchangeRateStr,
        currencyMode: options.currencyMode,
      }),
    });
  }

  return { transactions };
}
