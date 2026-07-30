/**
 * IBKR Trade History CSV export parser
 * Client Portal → Performance & Reports → Trade Confirmations / Flex → CSV
 *
 * Imports only EXECUTION rows (trades) and DETAIL rows (dividends, deposits, tax).
 * Skips ORDER / SYMBOL_SUMMARY / ASSET_SUMMARY to avoid duplication.
 * Stock BUY/SELL → transfer (investment), not consumption expense.
 */

import Papa from 'papaparse';
import type { Account, UnifiedTransaction } from '../types';
import { makeStableTransactionIds } from '../utils/dedup';
import { categoryFields } from '../utils/categoryDetect';

const TRADE_ASSET_CLASSES = new Set(['STK', 'FUND', 'ETF', 'OPT', 'WAR', 'BOND', 'CMDTY']);

export interface IbkrCsvImportResult {
  transactions: UnifiedTransaction[];
  accounts: Array<Omit<Account, 'id' | 'createdAt'>>;
  skipped: { fx: number; summary: number; empty: number };
}

function parseIbkrDateTime(raw?: string): number {
  if (!raw?.trim()) return Date.now();
  const [datePart, timePart = '00:00:00'] = raw.trim().split(';');
  const [dd, mm, yyyy] = datePart.split('/').map(Number);
  if (!yyyy || !mm || !dd) return Date.now();
  const [hh, min, sec] = timePart.split(':').map(Number);
  return new Date(yyyy, mm - 1, dd, hh || 0, min || 0, sec || 0).getTime();
}

function parseNum(raw?: string): number {
  if (!raw?.trim()) return 0;
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function splitSections(content: string): string[] {
  const lines = content.trim().split(/\r?\n/);
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.startsWith('"ClientAccountID"') && current.length > 0) {
      sections.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current);
  return sections.map((s) => s.join('\n')).filter((s) => s.trim().length > 0);
}

function isTradeSection(header: string[]): boolean {
  return header.includes('Buy/Sell') && header.includes('Proceeds');
}

function isCashSection(header: string[]): boolean {
  return header.includes('Type') && header.includes('Amount') && header.includes('Date/Time');
}

function mapTradeRow(
  row: Record<string, string>,
  internalAccountId: string,
  externalAccountId: string,
): UnifiedTransaction | null {
  const lod = row.LevelOfDetail?.trim();
  if (lod && lod !== 'EXECUTION') return null;

  const assetClass = row.AssetClass?.trim();
  const symbol = row.Symbol?.trim() ?? '';

  if (assetClass === 'CASH' || /\.(USD|EUR|GBP|UAH|JPY)$/i.test(symbol)) {
    // FX conversions are intentionally skipped (tracked separately / noisy)
    return null;
  }

  if (!assetClass || !TRADE_ASSET_CLASSES.has(assetClass)) return null;

  const buySell = (row['Buy/Sell'] ?? row.BuySell)?.trim().toUpperCase();
  if (buySell !== 'BUY' && buySell !== 'SELL') return null;

  const proceeds = Math.abs(parseNum(row.Proceeds));
  if (proceeds <= 0) return null;

  const commission = Math.abs(parseNum(row.IBCommission));
  const currency = row.IBCommissionCurrency?.trim()
    || row.CurrencyPrimary?.trim()
    || 'USD';
  const qty = row.Quantity?.trim() ?? '?';
  const price = row.TradePrice?.trim() ?? '?';
  const description = `${buySell} ${qty} ${symbol} @ ${price}`;

  const txDate = parseIbkrDateTime(row.DateTime || row.TradeDate);
  const preferredId = row.TransactionID?.trim() || row.TradeID?.trim();
  const { id, externalId } = makeStableTransactionIds(
    internalAccountId, 'ibkr', txDate, proceeds, currency, description, preferredId,
  );

  const { tag, category } = categoryFields(buySell === 'BUY' ? 'investment' : 'realized');

  return {
    id,
    accountId: internalAccountId,
    platform: 'ibkr',
    externalId,
    type: 'transfer',
    amount: proceeds,
    currency,
    feeAmount: commission,
    feeCurrency: currency,
    feeType: commission > 0 ? 'broker_fee' : undefined,
    description,
    tag,
    category,
    transactionDate: txDate,
    importedAt: Date.now(),
    rawPayload: JSON.stringify({ ...row, ibkrAccountId: externalAccountId, source: 'ibkr_csv_trade' }),
  };
}

function mapCashRow(
  row: Record<string, string>,
  internalAccountId: string,
  externalAccountId: string,
): UnifiedTransaction | null {
  if (row.LevelOfDetail?.trim() !== 'DETAIL') return null;

  const type = row.Type?.trim() ?? '';
  const amount = parseNum(row.Amount);
  if (Math.abs(amount) < 0.0001) return null;

  const currency = row.CurrencyPrimary?.trim() || 'USD';
  const txDate = parseIbkrDateTime(row['Date/Time'] || row.Date);
  const description = row.Description?.trim() || type;
  const preferredId = row.TransactionID?.trim() || row.ActionID?.trim();

  let txType: UnifiedTransaction['type'];
  let catKey: 'income' | 'dividend' | 'fee' | 'top_up' | 'transfer' | 'self_transfer' | 'other' = 'other';

  if (/dividend/i.test(type)) {
    txType = 'income';
    catKey = 'dividend';
  } else if (/withholding/i.test(type)) {
    txType = 'fee';
    catKey = 'fee';
  } else if (/deposit|withdrawal|CASH RECEIPTS|ELECTRONIC FUND TRANSFER|FUND TRANSFERS/i.test(`${type} ${description}`)) {
    txType = 'transfer';
    catKey = 'self_transfer';
  } else {
    txType = amount >= 0 ? 'income' : 'expense';
    catKey = amount >= 0 ? 'income' : 'other';
  }

  const absAmt = Math.abs(amount);
  const { id, externalId } = makeStableTransactionIds(
    internalAccountId, 'ibkr', txDate, absAmt, currency, description, preferredId,
  );
  const { tag, category } = categoryFields(catKey);

  return {
    id,
    accountId: internalAccountId,
    platform: 'ibkr',
    externalId,
    type: txType,
    amount: absAmt,
    currency,
    // Fee txs store the fee in `amount`; keep feeAmount at 0 to avoid double-counting in UI
    feeAmount: 0,
    feeCurrency: undefined,
    feeType: txType === 'fee' ? 'withholding_tax' : undefined,
    description,
    tag,
    category,
    transactionDate: txDate,
    importedAt: Date.now(),
    rawPayload: JSON.stringify({ ...row, ibkrAccountId: externalAccountId, source: 'ibkr_csv_cash' }),
  };
}

export function parseIbkrTradeHistoryCsv(
  csvContent: string,
  internalAccountId: string,
): IbkrCsvImportResult {
  const skipped = { fx: 0, summary: 0, empty: 0 };
  const transactions: UnifiedTransaction[] = [];
  const accountIds = new Set<string>();

  for (const section of splitSections(csvContent)) {
    const parsed = Papa.parse<Record<string, string>>(section.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.meta.fields?.length || parsed.data.length === 0) continue;

    const fields = parsed.meta.fields;

    if (isTradeSection(fields)) {
      for (const row of parsed.data) {
        const extId = row.ClientAccountID?.trim();
        if (extId) accountIds.add(extId);

        const lod = row.LevelOfDetail?.trim();
        if (lod && lod !== 'EXECUTION') {
          skipped.summary++;
          continue;
        }

        if (row.AssetClass?.trim() === 'CASH') {
          skipped.fx++;
        }

        const tx = mapTradeRow(row, internalAccountId, extId ?? 'ibkr');
        if (tx) transactions.push(tx);
        else skipped.empty++;
      }
    } else if (isCashSection(fields)) {
      for (const row of parsed.data) {
        const extId = row.ClientAccountID?.trim();
        if (extId) accountIds.add(extId);
        const tx = mapCashRow(row, internalAccountId, extId ?? 'ibkr');
        if (tx) transactions.push(tx);
      }
    }
  }

  const accounts = [...accountIds].map((externalId) => ({
    platform: 'ibkr' as const,
    name: `IBKR ${externalId}`,
    currency: 'USD',
    externalId,
    isActive: true,
  }));

  return { transactions, accounts, skipped };
}
