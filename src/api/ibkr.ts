/**
 * Interactive Brokers Flex Web Service
 * https://www.interactivebrokers.com/en/software/am/am/reports/activity_flex_queries.htm
 */

import type { Account, UnifiedTransaction } from '../types';
import { resolveImportCategory, categoryFields } from '../utils/categoryDetect';
import { makeStableTransactionIds } from '../utils/dedup';

const BASE = 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService';

export interface SyncProgress {
  step: string;
  current: number;
  total: number;
}

export interface IBKRSyncResult {
  transactions: UnifiedTransaction[];
  accounts: Array<Omit<Account, 'id' | 'createdAt'>>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseXmlTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
  return m?.[1]?.trim();
}

function parseXmlAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:-]+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function findElements(xml: string, tag: string): Record<string, string>[] {
  const results: Record<string, string>[] = [];
  const re = new RegExp(`<${tag}\\s+([^/>]+?)\\/?>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(parseXmlAttributes(m[1]));
  }
  return results;
}

function parseIBKRDateTime(raw: string): number {
  const [datePart, timePart = '000000'] = raw.split(';');
  const y = datePart.slice(0, 4);
  const mo = datePart.slice(4, 6);
  const d = datePart.slice(6, 8);
  const hh = timePart.slice(0, 2);
  const mm = timePart.slice(2, 4);
  const ss = timePart.slice(4, 6);
  return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}`).getTime();
}

function parseIBKRDate(raw: string): number {
  const y = raw.slice(0, 4);
  const mo = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  return new Date(`${y}-${mo}-${d}T12:00:00`).getTime();
}

function calculateIBKRFee(trade: Record<string, string>): number {
  const parts = ['commission', 'taxes', 'brokerFees', 'thirdPartyFees', 'otherFees'];
  return parts.reduce((sum, key) => sum + Math.abs(parseFloat(trade[key] ?? '0') || 0), 0);
}

function mapIBKRTrade(trade: Record<string, string>, internalAccountId: string): UnifiedTransaction {
  const proceeds = Math.abs(parseFloat(trade.proceeds ?? trade.tradeMoney ?? '0') || 0);
  const fee = calculateIBKRFee(trade);
  const currency = trade.currency ?? 'USD';
  const symbol = trade.symbol ?? trade.description ?? 'Unknown';
  const qty = trade.quantity ?? '?';
  const price = trade.tradePrice ?? '?';
  const buySell = (trade.buySell ?? 'TRADE').toUpperCase();
  const description = `${buySell} ${qty} ${symbol} @ ${price}`;
  // Only BUY counts as investment spend; SELL is a transfer out of the asset
  const { tag, category } = categoryFields(buySell === 'BUY' ? 'investment' : 'realized');
  const txDate = parseIBKRDateTime(trade.dateTime ?? trade.tradeDate ?? '');
  const preferredId = trade.transactionID?.trim() || trade.tradeID?.trim();
  const { id, externalId } = makeStableTransactionIds(
    internalAccountId, 'ibkr', txDate, proceeds, currency, description, preferredId,
  );

  return {
    id,
    accountId:       internalAccountId,
    platform:        'ibkr',
    externalId,
    type:            'transfer',
    amount:          proceeds,
    currency,
    feeAmount:       fee,
    feeCurrency:     currency,
    feeType:         fee > 0 ? 'broker_fee' : undefined,
    description,
    tag,
    category,
    transactionDate: txDate,
    importedAt:      Date.now(),
    rawPayload:      JSON.stringify(trade),
  };
}

function mapIBKRCashTransaction(tx: Record<string, string>, internalAccountId: string): UnifiedTransaction {
  const amount = parseFloat(tx.amount ?? '0') || 0;
  const currency = tx.currency ?? 'USD';
  const txType = tx.type ?? '';
  const isWHTax = /withholding/i.test(txType);
  const isDividend = /dividend/i.test(txType);
  const desc = tx.description ?? '';
  const isDeposit = /deposit|withdrawal|CASH RECEIPTS|ELECTRONIC FUND TRANSFER|FUND TRANSFERS/i.test(
    `${txType} ${desc}`,
  );
  const type = isWHTax ? 'fee' as const
    : isDeposit ? 'transfer' as const
    : amount >= 0 ? 'income' as const
    : 'expense' as const;

  const absAmt = Math.abs(amount);
  const catKey = resolveImportCategory({
    description: desc,
    amount: absAmt,
    platform: 'ibkr',
    type,
    currency,
    bankCategory: isDividend ? 'dividend' : undefined,
    selfTransfer: isDeposit,
  });
  const { tag, category } = categoryFields(
    isWHTax ? 'fee'
      : isDeposit ? 'self_transfer'
      : isDividend ? 'dividend'
      : catKey,
  );

  const description = desc;
  const txDate = parseIBKRDate(tx.tradeDate ?? tx.dateTime ?? '');
  const preferredId = tx.transactionID?.trim() || tx.actionID?.trim();
  const { id, externalId } = makeStableTransactionIds(
    internalAccountId, 'ibkr', txDate, absAmt, currency, description, preferredId,
  );

  return {
    id,
    accountId:       internalAccountId,
    platform:        'ibkr',
    externalId,
    type,
    amount:          absAmt,
    currency,
    // Fee txs store the fee in `amount`; keep feeAmount at 0 to avoid double-counting in UI
    feeAmount:       0,
    feeCurrency:     undefined,
    feeType:         isWHTax ? 'withholding_tax' : undefined,
    description,
    tag,
    category,
    transactionDate: txDate,
    importedAt:      Date.now(),
    rawPayload:      JSON.stringify(tx),
  };
}

async function sendFlexRequest(token: string, queryId: string): Promise<string> {
  const cleanToken = token.trim();
  const cleanQuery = queryId.trim();
  const url = `${BASE}/SendRequest?t=${encodeURIComponent(cleanToken)}&q=${encodeURIComponent(cleanQuery)}&v=3`;
  const res = await fetch(url);
  const xml = await res.text();

  const status = parseXmlTag(xml, 'Status') ?? '';
  if (!/success/i.test(status)) {
    const code = parseXmlTag(xml, 'ErrorCode');
    const msg = parseXmlTag(xml, 'ErrorMessage') ?? xml.slice(0, 200);
    if (/invalid token|1017|1018/i.test((code ?? '') + msg)) {
      throw new Error('IBKR: невірний Flex Token — перевірте або створіть новий');
    }
    if (/invalid query|1016/i.test((code ?? '') + msg)) {
      throw new Error('IBKR: невірний Query ID');
    }
    throw new Error(code ? `IBKR ${code}: ${msg}` : `IBKR SendRequest failed: ${msg}`);
  }

  const referenceCode = parseXmlTag(xml, 'ReferenceCode');
  if (!referenceCode) throw new Error('IBKR: missing ReferenceCode in response');
  return referenceCode;
}

async function getFlexStatement(token: string, referenceCode: string, onProgress?: (step: string) => void): Promise<string> {
  const url = `${BASE}/GetStatement?t=${encodeURIComponent(token)}&q=${encodeURIComponent(referenceCode)}&v=3`;

  // IBKR generates reports asynchronously — first poll after a short pause
  await sleep(2000);

  for (let attempt = 0; attempt < 20; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.min(4000 + attempt * 500, 8000);
      onProgress?.(`Retry ${attempt}/19…`);
      await sleep(waitMs);
    }

    const res = await fetch(url);
    const xml = await res.text();

    if (!xml.trim()) continue;

    const status = parseXmlTag(xml, 'Status') ?? '';
    const errorCode = parseXmlTag(xml, 'ErrorCode') ?? '';
    const errorMsg = parseXmlTag(xml, 'ErrorMessage') ?? '';

    if (/warn|please try again|in progress|1019/i.test(status + errorCode + errorMsg)) {
      continue;
    }

    if (/fail/i.test(status)) {
      if (/invalid token|token expired|1017|1018/i.test(errorCode + errorMsg)) {
        throw new Error('IBKR: невірний або прострочений Flex Token — створіть новий у Client Portal');
      }
      if (/invalid query|query id|1016/i.test(errorCode + errorMsg)) {
        throw new Error('IBKR: невірний Query ID — перевірте ID у Flex Queries');
      }
      throw new Error(`IBKR GetStatement: ${errorMsg || status || errorCode}`);
    }

    if (
      xml.includes('<FlexQueryResponse')
      || xml.includes('<FlexStatement ')
      || xml.includes('<Trade ')
      || xml.includes('<CashTransaction ')
    ) {
      return xml;
    }

    // Empty report — valid response with no transactions
    if (xml.includes('<FlexStatements') && !xml.includes('<Trade ') && !xml.includes('<CashTransaction ')) {
      return xml;
    }
  }

  throw new Error('IBKR: звіт не згенерувався за 2 хв — спробуйте ще раз через хвилину');
}

export function parseIBKRFlexXml(xml: string): {
  transactions: UnifiedTransaction[];
  accounts: Array<Omit<Account, 'id' | 'createdAt'>>;
} {
  const trades = findElements(xml, 'Trade');
  const cashTxs = findElements(xml, 'CashTransaction');
  const accountMeta = new Map<string, string>();
  const transactions: UnifiedTransaction[] = [];

  for (const item of [...trades, ...cashTxs]) {
    const accId = item.accountId;
    if (accId) accountMeta.set(accId, item.currency ?? 'USD');
  }

  for (const trade of trades) {
    const accId = trade.accountId;
    if (!accId) continue;
    transactions.push(mapIBKRTrade(trade, accId));
  }

  for (const tx of cashTxs) {
    const accId = tx.accountId;
    if (!accId) continue;
    transactions.push(mapIBKRCashTransaction(tx, accId));
  }

  const accounts = [...accountMeta.entries()].map(([externalId, currency]) => ({
    platform: 'ibkr' as const,
    name: `IBKR ${externalId}`,
    currency,
    externalId,
    isActive: true,
  }));

  return { transactions, accounts };
}

export async function fetchIBKRFlexReport(
  token: string,
  queryId: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<IBKRSyncResult> {
  onProgress?.({ step: 'SendRequest', current: 0, total: 2 });
  const referenceCode = await sendFlexRequest(token, queryId);

  onProgress?.({ step: 'GetStatement', current: 1, total: 2 });
  const xml = await getFlexStatement(token, referenceCode, (step) => {
    onProgress?.({ step, current: 1, total: 2 });
  });

  const result = parseIBKRFlexXml(xml);
  onProgress?.({ step: 'done', current: 2, total: 2 });
  return result;
}
