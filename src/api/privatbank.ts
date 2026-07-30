/**
 * PrivatBank XLSX / CSV export parser
 *
 * Export from Privat24 → Виписка → Завантажити (XLS/XLSX or CSV)
 *
 * XLSX columns (10 columns):
 *   0: Date ("dd.MM.yyyy HH:mm:ss")
 *   1: Category/Type
 *   2: Card number (masked "4149 **** **** 8921")
 *   3: Description / Counterparty
 *   4: Amount in card currency (signed; negative = expense)  ← authoritative for P&L
 *   5: Card currency ("UAH")
 *   6: Amount in transaction currency (often absolute, e.g. 12.82 USD)
 *   7: Transaction currency ("USD" / "EUR" / "UAH")
 *   8: Balance
 *   9: Balance currency
 *
 * IMPORTANT: Never pair col6 amount with col5 currency — that turns $12.82 into 12.82 ₴.
 */

import type { Account, UnifiedTransaction } from '../types';
import { makeStableTransactionIds } from '../utils/dedup';
import { buildOwnAccountContext, isSelfTransfer } from '../utils/selfTransfer';
import { resolveImportCategory, categoryFields } from '../utils/categoryDetect';
import * as XLSX from 'xlsx';

function parsePrivatDate(s: string): number {
  if (!s || typeof s !== 'string') return Date.now();
  const [datePart, timePart] = s.trim().split(' ');
  const [dd, mm, yyyy] = (datePart ?? '').split('.').map(Number);
  const [hh, min, sec] = (timePart ?? '00:00:00').split(':').map(Number);
  if (!yyyy) return Date.now();
  return new Date(yyyy, mm - 1, dd, hh || 0, min || 0, sec || 0).getTime();
}

function parsePrivatNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw ?? '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export interface PrivatImportResult {
  cardNumber: string;
  currency: string;
  transactions: UnifiedTransaction[];
}

function mapPrivatRow(
  cols: unknown[],
  internalAccountId: string,
  ctx: ReturnType<typeof buildOwnAccountContext>,
  ownIbans: string[],
  ownAccounts?: Account[],
): { tx: UnifiedTransaction; cardNumber?: string; currency: string } | null {
  if (!cols[0]) return null;

  const dateStr = String(cols[0] ?? '').trim();
  const bankCat = String(cols[1] ?? '').trim();
  const cardMasked = cols[2] != null ? String(cols[2]).trim() : '';
  const desc = String(cols[3] ?? '').trim();
  const cardAmount = parsePrivatNumber(cols[4]);
  const cardCur = (String(cols[5] ?? 'UAH').trim() || 'UAH').toUpperCase();
  const txAmountRaw = parsePrivatNumber(cols[6]);
  const txCur = (String(cols[7] ?? '').trim() || cardCur).toUpperCase();
  const balanceAfter = cols[8] != null && String(cols[8]).trim() !== ''
    ? parsePrivatNumber(cols[8])
    : null;

  // Always book in card currency — what actually left/entered the card balance
  const amount = Math.abs(cardAmount);
  if (amount === 0 && Math.abs(txAmountRaw) === 0) return null;

  const currency = cardCur;
  const date = parsePrivatDate(dateStr);
  const self = isSelfTransfer(desc, undefined, undefined, ctx);
  const type: UnifiedTransaction['type'] = self
    ? 'transfer'
    : (cardAmount >= 0 ? 'income' : 'expense');

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

  const exchangeRate =
    Math.abs(txAmountRaw) > 0 && cardCur !== txCur
      ? Math.abs(cardAmount) / Math.abs(txAmountRaw)
      : undefined;

  return {
    cardNumber: cardMasked || undefined,
    currency,
    tx: {
      id,
      accountId: internalAccountId,
      platform: 'privatbank',
      externalId,
      type,
      amount,
      currency,
      exchangeRate,
      feeAmount: 0,
      description: desc || undefined,
      tag: tag ?? undefined,
      category,
      transactionDate: date,
      importedAt: Date.now(),
      rawPayload: JSON.stringify({
        dateStr,
        bankCat,
        desc,
        cardAmount,
        cardCurrency: cardCur,
        txAmount: txAmountRaw,
        txCurrency: txCur,
        exchangeRate: exchangeRate ?? null,
        balanceAfter,
      }),
    },
  };
}

export function parsePrivatbankXlsx(
  xlsxBuffer: ArrayBuffer,
  internalAccountId: string,
  ownIbans: string[] = [],
  ownAccounts?: Account[],
): PrivatImportResult {
  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  if (rawRows.length < 3) return { cardNumber: '', currency: 'UAH', transactions: [] };

  const dataRows = rawRows.slice(2);
  let cardNumber = '';
  let currency = 'UAH';
  const transactions: UnifiedTransaction[] = [];

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  for (const row of dataRows) {
    const mapped = mapPrivatRow(row, internalAccountId, ctx, ownIbans, ownAccounts);
    if (!mapped) continue;
    if (!cardNumber && mapped.cardNumber) cardNumber = mapped.cardNumber;
    currency = mapped.currency;
    transactions.push(mapped.tx);
  }

  return { cardNumber, currency, transactions };
}

/**
 * Parse PrivatBank CSV export (semicolon-separated alternative)
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

  const dataLines = lines.slice(2);
  let cardNumber = '';
  let currency = 'UAH';
  const transactions: UnifiedTransaction[] = [];

  const ctx = ownAccounts
    ? buildOwnAccountContext(ownAccounts)
    : { ibans: ownIbans, names: [], last4Digits: [] };

  for (const line of dataLines) {
    const cols = line.split(';');
    if (cols.length < 5) continue;

    const mapped = mapPrivatRow(cols, internalAccountId, ctx, ownIbans, ownAccounts);
    if (!mapped) continue;
    if (!cardNumber && mapped.cardNumber) cardNumber = mapped.cardNumber;
    currency = mapped.currency;
    transactions.push(mapped.tx);
  }

  return { cardNumber, currency, transactions };
}
