import type { UnifiedTransaction } from '../types';
import { getDatabase } from '../db/migrations';
import { makeTransactionFingerprint } from './dedup';
import type { DupConfirmShow } from '../hooks/useImportDuplicatesConfirm';

export type AlertShow = (
  title: string,
  message?: string,
  buttons?: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>,
) => void;

export interface ImportDuplTranslations {
  importDuplicatesMessage: string;
  importDuplicatesTitle: string;
  importRejectDuplicates: string;
  importAddAnyway: string;
  importCancelImport: string;
  importAddWithoutDuplicates: string;
  importAddWithDuplicates: string;
}

export interface ImportDuplicateAnalysis {
  duplicates: UnifiedTransaction[];
  unique: UnifiedTransaction[];
}

function fingerprintFromRow(row: {
  account_id: string;
  platform: UnifiedTransaction['platform'];
  transaction_date: number;
  amount: number;
  currency: string;
  description: string | null;
}): string {
  return makeTransactionFingerprint(
    row.account_id,
    row.platform,
    row.transaction_date,
    row.amount,
    row.currency,
    row.description ?? undefined,
  );
}

/**
 * Compare import rows only to what is already in SQLite.
 * Does NOT dedupe within the statement itself — multiple similar rows in one file stay unique.
 *
 * Soft ±5 min / loose fingerprints are NOT used here — they previously hid legitimate
 * near-identical rows (e.g. two +0.01 From: … a few minutes apart).
 * Hard matches only: same id, external_id, or exact account fingerprint.
 */
export function analyzeImportDuplicates(txs: UnifiedTransaction[]): ImportDuplicateAnalysis {
  const db = getDatabase();
  const existingRows = db.getAllSync<{
    id: string;
    account_id: string;
    platform: UnifiedTransaction['platform'];
    external_id: string | null;
    transaction_date: number;
    amount: number;
    currency: string;
    description: string | null;
  }>(
    `SELECT id, account_id, platform, external_id, transaction_date, amount, currency, description
     FROM transactions`,
  );

  const existingIds = new Set(existingRows.map((r) => r.id));
  const existingExternal = new Set(
    existingRows
      .filter((r) => r.external_id)
      .map((r) => `${r.platform}|${r.external_id}`),
  );
  const existingFingerprints = new Set(existingRows.map(fingerprintFromRow));

  const duplicates: UnifiedTransaction[] = [];
  const unique: UnifiedTransaction[] = [];

  for (const tx of txs) {
    const fp = makeTransactionFingerprint(
      tx.accountId, tx.platform, tx.transactionDate, tx.amount, tx.currency, tx.description,
    );
    const extKey = tx.externalId ? `${tx.platform}|${tx.externalId}` : null;
    const isDup = existingIds.has(tx.id)
      || (extKey != null && existingExternal.has(extKey))
      || existingFingerprints.has(fp);

    if (isDup) duplicates.push(tx);
    else unique.push(tx);
  }

  return { duplicates, unique };
}

export function reassignTransactionId(tx: UnifiedTransaction): UnifiedTransaction {
  const suffix = `_r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return {
    ...tx,
    id: `${tx.id}${suffix}`,
    externalId: tx.externalId ? `${tx.externalId}${suffix}` : `forced${suffix}`,
  };
}

export function confirmImportTransactions(
  label: string,
  transactions: UnifiedTransaction[],
  upsert: (
    txs: UnifiedTransaction[],
    opts?: { forceInsert?: boolean },
  ) => { inserted: number; updated?: number; total: number },
  showResult: (lbl: string, result: { inserted: number; updated?: number }) => void,
  showDupConfirm: DupConfirmShow,
  t: ImportDuplTranslations,
): Promise<void> {
  const { duplicates, unique } = analyzeImportDuplicates(transactions);
  if (duplicates.length === 0) {
    showResult(label, upsert(transactions));
    return Promise.resolve();
  }

  const msg = t.importDuplicatesMessage
    .replace('{dup}', String(duplicates.length))
    .replace('{total}', String(transactions.length));

  return new Promise((resolve) => {
    showDupConfirm({
      title: t.importDuplicatesTitle,
      message: msg,
      duplicates,
      onCancel: () => { resolve(); },
      onAddWithoutDuplicates: () => {
        if (unique.length > 0) showResult(label, upsert(unique));
        resolve();
      },
      onAddWithDuplicates: (selected) => {
        const toForce = (selected.length > 0 ? selected : duplicates).map(reassignTransactionId);
        showResult(label, upsert([...unique, ...toForce], { forceInsert: true }));
        resolve();
      },
    });
  });
}
