/**
 * PrivatBank XLSX / CSV export parser
 *
 * Export from Privat24 → Виписка → Завантажити (XLS/XLSX or CSV)
 *
 * XLSX columns (10 columns):
 *   0: Date ("dd.MM.yyyy HH:mm:ss")
 *   1: Category/Type (Переказ | Поповнення | Розрахункові операції | ...)
 *   2: Card number (masked "4149 **** **** 8921")
 *   3: Description / Counterparty
 *   4: Amount in card currency (negative = expense)
 *   5: Card currency ("UAH")
 *   6: Amount in account currency (absolute value)
 *   7: Account currency
 *   8: Balance (nullable)
 *   9: Balance currency
 *
 * The type is determined from the amount sign (col 4):
 *   negative → expense, positive → income
 *
 * CSV (alternative): same columns, semicolon-separated
 */

import type { Account, UnifiedTransaction } from '../types';
import { makeStableTransactionIds } from '../utils/dedup';
import { buildOwnAccountContext, isSelfTransfer } from '../utils/selfTransfer';
import { resolveImportCategory, categoryFields } from '../utils/categoryDetect';
import * as XLSX from 'xlsx';

function parsePrivatDate(s: string): number {
  if (!s || typeof s !== 'string') return Date.now();
  // "dd.MM.yyyy HH:mm:ss"
  const [datePart, timePart] = s.trim().split(' ');
  const [dd, mm, yyyy] = (datePart ?? '').split('.').map(Number);
  const [hh, min, sec] = (timePart ?? '00:00:00').split(':').map(Number);
  if (!yyyy) return Date.now();
  return new Date(yyyy, mm - 1, dd, hh || 0, min || 0, sec || 0).getTime();
}

export interface PrivatImportResult {
  cardNumber:   string;
  currency:     string;
  transactions: UnifiedTransaction[];
}

export function parsePrivatbankXlsx(
  xlsxBuffer: ArrayBuffer,
  internalAccountId: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
): PrivatImportResult {
  const workbook  = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet     = workbook.Sheets[sheetName];

  // Convert to array-of-arrays (skipping first title row)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  if (rawRows.length < 3) return { cardNumber: '', currency: 'UAH', transactions: [] };

  // Row 0 = title; Row 1 = headers; Rows 2+ = data
  const dataRows  = rawRows.slice(2);
  let cardNumber  = '';
  let currency    = 'UAH';
  const transactions: UnifiedTransaction[] = [];

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  for (const row of dataRows) {
    if (!row[0]) continue;

    const dateStr    = String(row[0] ?? '').trim();
    const bankCat    = String(row[1] ?? '').trim();
    const desc       = String(row[3] ?? '').trim();
    const amountStr  = String(row[4] ?? '0');
    const cardCur    = String(row[5] ?? 'UAH').trim();
    const absAmount  = String(row[6] ?? '0');

    if (!cardNumber && row[2]) {
      cardNumber = String(row[2]).trim();
    }
    currency = cardCur || 'UAH';

    const cardAmount = parseFloat(amountStr) || 0;
    const amount     = Math.abs(parseFloat(absAmount) || 0) || Math.abs(cardAmount);
    if (cardAmount === 0 && amount === 0) continue;

    const date = parsePrivatDate(dateStr);
    const self = isSelfTransfer(desc, undefined, undefined, ctx);
    const type: UnifiedTransaction['type'] = self ? 'transfer' : (cardAmount >= 0 ? 'income' : 'expense');
    const catKey = resolveImportCategory({
      description: desc,
      bankCategory: bankCat || undefined,
      ownIbans,
      ownAccounts,
      amount,
      platform: 'privatbank',
      type,
      currency,
      selfTransfer: self,
    });
    const { tag, category } = categoryFields(catKey);

    const { id, externalId } = makeStableTransactionIds(
      internalAccountId, 'privatbank', date, amount, currency, desc,
    );

    transactions.push({
      id,
      accountId:       internalAccountId,
      platform:        'privatbank',
      externalId,
      type,
      amount,
      currency,
      feeAmount:       0,
      description:     desc || undefined,
      tag:             tag ?? undefined,
      category,
      transactionDate: date,
      importedAt:      Date.now(),
      rawPayload:      JSON.stringify({ dateStr, bankCat, desc, cardAmount, currency }),
    });
  }

  return { cardNumber, currency, transactions };
}

/**
 * Parse PrivatBank CSV export (semicolon-separated alternative)
 * Some older Privat24 exports use CSV with same column structure
 */
export function parsePrivatbankCsv(
  csvContent: string,
  internalAccountId: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
): PrivatImportResult {
  const lines = csvContent
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 3) return { cardNumber: '', currency: 'UAH', transactions: [] };

  // Skip title (row 0) and headers (row 1)
  const dataLines  = lines.slice(2);
  let cardNumber   = '';
  let currency     = 'UAH';
  const transactions: UnifiedTransaction[] = [];

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  for (const line of dataLines) {
    const cols = line.split(';');
    if (cols.length < 5) continue;

    const dateStr   = cols[0]?.trim() ?? '';
    const bankCat   = cols[1]?.trim() ?? '';
    const desc      = cols[3]?.trim() ?? '';
    const amountStr = cols[4]?.trim() ?? '0';
    const cardCur   = cols[5]?.trim() ?? 'UAH';
    const absAmt    = cols[6]?.trim() ?? '0';

    if (!cardNumber && cols[2]) cardNumber = cols[2].trim();
    currency = cardCur;

    const cardAmount = parseFloat(amountStr.replace(',', '.')) || 0;
    const amount     = Math.abs(parseFloat(absAmt.replace(',', '.')) || 0) || Math.abs(cardAmount);
    if (!amount) continue;

    const date = parsePrivatDate(dateStr);
    const self = isSelfTransfer(desc, undefined, undefined, ctx);
    const type: UnifiedTransaction['type'] = self ? 'transfer' : (cardAmount >= 0 ? 'income' : 'expense');
    const catKey = resolveImportCategory({
      description: desc,
      bankCategory: bankCat || undefined,
      ownIbans,
      ownAccounts,
      amount,
      platform: 'privatbank',
      type,
      currency,
      selfTransfer: self,
    });
    const { tag, category } = categoryFields(catKey);
    const { id, externalId } = makeStableTransactionIds(
      internalAccountId, 'privatbank', date, amount, currency, desc,
    );

    transactions.push({
      id,
      accountId:       internalAccountId,
      platform:        'privatbank',
      externalId,
      type,
      amount,
      currency,
      feeAmount:       0,
      description:     desc || undefined,
      tag:             tag ?? undefined,
      category,
      transactionDate: date,
      importedAt:      Date.now(),
      rawPayload:      JSON.stringify({ dateStr, bankCat, desc, cardAmount, currency }),
    });
  }

  return { cardNumber, currency, transactions };
}
