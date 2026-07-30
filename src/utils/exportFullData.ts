import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../db/migrations';
import { isInvestmentPurchase, storedCategoryKey } from './categories';
import {
  findMatchingRules,
  loadAllCategoryRules,
  type CategoryRule,
  type MatchedRuleInfo,
} from './categoryRules';
import type { Platform, TransactionType } from '../types';

export interface ExportTransactionRow {
  id: string;
  accountId: string;
  accountName: string | null;
  accountDisplayName: string | null;
  platform: Platform;
  externalId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  amountBase: number | null;
  exchangeRate: number | null;
  feeAmount: number;
  feeCurrency: string | null;
  feeType: string | null;
  description: string | null;
  category: string | null;
  tag: string | null;
  categoryLocked: boolean;
  storedCategory: string;
  mcc: number | null;
  counterparty: string | null;
  directionFrom: string | null;
  directionTo: string | null;
  transactionDate: number;
  transactionDateIso: string;
  importedAt: number;
  importedAtIso: string;
  rawPayload: string | null;
  matchedRules: MatchedRuleInfo[];
  winningRuleId: string | null;
}

export interface ExportPayload {
  exportedAt: string;
  app: string;
  version: string;
  statistics: {
    transactionCount: number;
    accountCount: number;
    ruleCount: number;
    enabledRuleCount: number;
    dateFrom: string | null;
    dateTo: string | null;
    byType: Record<string, { count: number; amountSum: number }>;
    byPlatform: Record<string, { count: number; amountSum: number }>;
    byCategory: Record<string, { count: number; amountSum: number }>;
    byCurrency: Record<string, { count: number; amountSum: number }>;
    byAccount: Record<string, { name: string; count: number; amountSum: number }>;
    incomeTotal: number;
    expenseTotal: number;
    feeTotal: number;
    transferTotal: number;
    investmentPurchaseTotal: number;
    investmentPurchaseCount: number;
    rulesHitCount: Record<string, number>;
    transactionsWithRuleMatch: number;
    transactionsWithoutRuleMatch: number;
  };
  accounts: Array<Record<string, unknown>>;
  categoryRules: CategoryRule[];
  transactions: ExportTransactionRow[];
}

function bump(
  map: Record<string, { count: number; amountSum: number }>,
  key: string,
  amount: number,
) {
  const cur = map[key] ?? { count: 0, amountSum: 0 };
  cur.count += 1;
  cur.amountSum += amount;
  map[key] = cur;
}

/** Build full export object from SQLite (transactions + stats + rules). */
export function buildFullDataExport(): ExportPayload {
  const db = getDatabase();
  const rules = loadAllCategoryRules();
  const enabledRules = rules.filter((r) => r.enabled);

  const accountRows = db.getAllSync<Record<string, unknown>>(
    `SELECT id, platform, name, currency, iban, external_id, balance, is_active,
            created_at, display_name, color
     FROM accounts ORDER BY created_at ASC`,
  );
  const accountMap = new Map(
    accountRows.map((a) => [a.id as string, a]),
  );

  const txRows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM transactions ORDER BY transaction_date DESC, id DESC`,
  );

  const byType: Record<string, { count: number; amountSum: number }> = {};
  const byPlatform: Record<string, { count: number; amountSum: number }> = {};
  const byCategory: Record<string, { count: number; amountSum: number }> = {};
  const byCurrency: Record<string, { count: number; amountSum: number }> = {};
  const byAccount: Record<string, { name: string; count: number; amountSum: number }> = {};
  const rulesHitCount: Record<string, number> = {};

  let incomeTotal = 0;
  let expenseTotal = 0;
  let feeTotal = 0;
  let transferTotal = 0;
  let investmentPurchaseTotal = 0;
  let investmentPurchaseCount = 0;
  let transactionsWithRuleMatch = 0;
  let transactionsWithoutRuleMatch = 0;
  let minDate: number | null = null;
  let maxDate: number | null = null;

  const transactions: ExportTransactionRow[] = txRows.map((r) => {
    const accountId = r.account_id as string;
    const acc = accountMap.get(accountId);
    const amount = Math.abs(r.amount as number);
    const type = r.type as TransactionType;
    const platform = r.platform as Platform;
    const tag = (r.tag as string | null) ?? null;
    const category = (r.category as string | null) ?? null;
    const description = (r.description as string | null) ?? null;
    const mcc = (r.mcc as number | null) ?? null;
    const currency = r.currency as string;
    const txDate = r.transaction_date as number;
    const importedAt = r.imported_at as number;

    const stored = storedCategoryKey({ tag, category });
    const matchedRules = findMatchingRules(
      {
        mcc: mcc ?? undefined,
        description: description ?? undefined,
        amount,
        platform,
        type,
        currency,
      },
      rules,
    );
    const winningRuleId = matchedRules.find((m) => m.isWinner)?.id ?? null;

    if (matchedRules.length > 0) transactionsWithRuleMatch += 1;
    else transactionsWithoutRuleMatch += 1;

    for (const m of matchedRules) {
      rulesHitCount[m.id] = (rulesHitCount[m.id] ?? 0) + 1;
    }

    bump(byType, type, amount);
    bump(byPlatform, platform, amount);
    bump(byCategory, stored, amount);
    bump(byCurrency, currency, amount);

    const accName = (acc?.display_name as string | null) ?? (acc?.name as string | null) ?? accountId;
    const accEntry = byAccount[accountId] ?? { name: accName, count: 0, amountSum: 0 };
    accEntry.count += 1;
    accEntry.amountSum += amount;
    byAccount[accountId] = accEntry;

    if (type === 'income') incomeTotal += amount;
    else if (type === 'expense') expenseTotal += amount;
    else if (type === 'fee') feeTotal += amount;
    else if (type === 'transfer') transferTotal += amount;

    const investTx = {
      tag: tag ?? undefined,
      category: category ?? undefined,
      description: description ?? undefined,
    };
    if (isInvestmentPurchase(investTx)) {
      investmentPurchaseTotal += amount;
      investmentPurchaseCount += 1;
    }

    if (minDate == null || txDate < minDate) minDate = txDate;
    if (maxDate == null || txDate > maxDate) maxDate = txDate;

    return {
      id: r.id as string,
      accountId,
      accountName: (acc?.name as string | null) ?? null,
      accountDisplayName: (acc?.display_name as string | null) ?? null,
      platform,
      externalId: (r.external_id as string | null) ?? null,
      type,
      amount: r.amount as number,
      currency,
      amountBase: (r.amount_base as number | null) ?? null,
      exchangeRate: (r.exchange_rate as number | null) ?? null,
      feeAmount: (r.fee_amount as number) ?? 0,
      feeCurrency: (r.fee_currency as string | null) ?? null,
      feeType: (r.fee_type as string | null) ?? null,
      description,
      category,
      tag,
      categoryLocked: Boolean(r.category_locked),
      storedCategory: stored,
      mcc,
      counterparty: (r.counterparty as string | null) ?? null,
      directionFrom: (r.direction_from as string | null) ?? null,
      directionTo: (r.direction_to as string | null) ?? null,
      transactionDate: txDate,
      transactionDateIso: new Date(txDate).toISOString(),
      importedAt,
      importedAtIso: new Date(importedAt).toISOString(),
      rawPayload: (r.raw_payload as string | null) ?? null,
      matchedRules,
      winningRuleId,
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    app: 'finance-control',
    version: '1.0.0',
    statistics: {
      transactionCount: transactions.length,
      accountCount: accountRows.filter((a) => a.id !== 'acc_default').length,
      ruleCount: rules.length,
      enabledRuleCount: enabledRules.length,
      dateFrom: minDate != null ? new Date(minDate).toISOString() : null,
      dateTo: maxDate != null ? new Date(maxDate).toISOString() : null,
      byType,
      byPlatform,
      byCategory,
      byCurrency,
      byAccount,
      incomeTotal,
      expenseTotal,
      feeTotal,
      transferTotal,
      investmentPurchaseTotal,
      investmentPurchaseCount,
      rulesHitCount,
      transactionsWithRuleMatch,
      transactionsWithoutRuleMatch,
    },
    accounts: accountRows.map((a) => ({
      id: a.id,
      platform: a.platform,
      name: a.name,
      displayName: a.display_name,
      currency: a.currency,
      iban: a.iban,
      externalId: a.external_id,
      balance: a.balance,
      isActive: (a.is_active as number) === 1,
      createdAt: a.created_at,
      color: a.color,
    })),
    categoryRules: rules,
    transactions,
  };
}

/** Write export JSON to cache and open the system share sheet. */
export async function exportAndShareFullData(): Promise<{ uri: string; txCount: number }> {
  const payload = buildFullDataExport();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `finance-export-${stamp}.json`;
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('No writable directory');
  const uri = `${base}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: fileName,
    UTI: 'public.json',
  });

  return { uri, txCount: payload.statistics.transactionCount };
}
