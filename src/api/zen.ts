/**
 * ZEN Money CSV parser
 *
 * Export format: "EUR – Account Statement" CSV from ZEN app/portal
 * Columns (after "Transactions:" header row):
 *   Date | Transaction type | Description | Settlement amount | Settlement currency |
 *   Original amount | Original currency | Currency rate | Fee description |
 *   Fee amount | Fee currency | Balance
 *
 * Date format: "d MMM yyyy" e.g. "1 Apr 2026", "12 May 2026"
 * Types: "Incoming transfer", "Outgoing transfer"
 */

import Papa from 'papaparse';
import type { Account, UnifiedTransaction } from '../types';
import { makeStableTransactionIds } from '../utils/dedup';
import { buildOwnAccountContext, isSelfTransfer } from '../utils/selfTransfer';
import { autoDetectTag } from '../utils/tags';

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseZenDate(s: string): number {
  // "1 Apr 2026" → timestamp
  const parts = s.trim().split(' ');
  if (parts.length < 3) return Date.now();
  const day   = parseInt(parts[0], 10);
  const month = MONTH_MAP[parts[1].toLowerCase().slice(0, 3)] ?? 0;
  const year  = parseInt(parts[2], 10);
  return new Date(year, month, day, 12, 0, 0).getTime();
}

export interface ZenImportResult {
  iban:         string;
  currency:     string;
  transactions: UnifiedTransaction[];
}

export function parseZenCsv(
  csvContent: string,
  internalAccountId: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
): ZenImportResult {
  let iban     = '';
  let currency = 'EUR';

  // Extract IBAN from metadata section
  const ibanMatch = csvContent.match(/Local IBAN\/Account Number:\s*([A-Z0-9]+)/);
  if (ibanMatch) iban = ibanMatch[1].trim();

  const currencyMatch = csvContent.match(/^Currency:\s*([A-Z]+)/m);
  if (currencyMatch) currency = currencyMatch[1].trim();

  // Find "Transactions:" section – the CSV data starts at the header row right after it
  const txIdx = csvContent.indexOf('Transactions:');
  if (txIdx === -1) return { iban, currency, transactions: [] };

  // The CSV data block starts at the NEXT non-empty line after "Transactions:"
  const csvBlock = csvContent.slice(txIdx + 'Transactions:'.length);

  // PapaParse the block (first non-empty line will be the header)
  const result = Papa.parse<string[]>(csvBlock.trim(), {
    skipEmptyLines: true,
  });

  const rows = result.data as string[][];
  if (rows.length < 2) return { iban, currency, transactions: [] };

  // First row is headers; skip it
  const dataRows = rows.slice(1);
  const transactions: UnifiedTransaction[] = [];

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  for (const row of dataRows) {
    // Skip footer lines that start with non-date text
    if (!row[0] || /^this is|^UAB ZEN/i.test(row[0].trim())) continue;

    const [
      dateStr, txType, description,
      settlementAmtStr, settlementCurrency,
      , , ,
      , feeAmtStr,
    ] = row;

    const settlementAmt = parseFloat(settlementAmtStr ?? '0');
    const feeAmt        = Math.abs(parseFloat(feeAmtStr ?? '0') || 0);
    if (isNaN(settlementAmt)) continue;

    const date = parseZenDate(dateStr ?? '');

    const type =
      txType === 'Incoming transfer'
        ? settlementAmt > 0 ? 'income' as const : 'transfer' as const
        : 'expense' as const;

    const desc = description?.replace(/^"/, '').replace(/"$/, '').trim();

    const self = isSelfTransfer(desc, undefined, undefined, ctx)
      || ownIbans.some((own) => desc?.includes(own));

    const tag = self
      ? ('self_transfer' as const)
      : autoDetectTag(undefined, desc, ownIbans, undefined, ownAccounts);

    const amount = Math.abs(settlementAmt);
    const txCurrency = settlementCurrency?.trim() || currency;
    const { id, externalId } = makeStableTransactionIds(
      internalAccountId, 'zen', date, amount, txCurrency, desc,
    );

    transactions.push({
      id,
      accountId:       internalAccountId,
      platform:        'zen',
      externalId,
      type:            self ? 'transfer' : type,
      amount,
      currency:        txCurrency,
      feeAmount:       feeAmt,
      description:     desc || undefined,
      tag:             tag ?? undefined,
      transactionDate: date,
      importedAt:      Date.now(),
      rawPayload:      JSON.stringify(row),
    });
  }

  return { iban, currency, transactions };
}
