import type { UnifiedTransaction } from '../types';
import { getDatabase } from '../db/migrations';
import { makeTransactionFingerprint } from './dedup';

export interface ImportDuplicateAnalysis {
  duplicates: UnifiedTransaction[];
  unique: UnifiedTransaction[];
}

function fingerprintFromRow(row: Record<string, unknown>): string {
  return makeTransactionFingerprint(
    row.account_id as string,
    row.platform as UnifiedTransaction['platform'],
    row.transaction_date as number,
    row.amount as number,
    row.currency as string,
    (row.description as string | null) ?? undefined,
  );
}

export function analyzeImportDuplicates(txs: UnifiedTransaction[]): ImportDuplicateAnalysis {
  const db = getDatabase();
  const existingRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM transactions');
  const existingIds = new Set(existingRows.map((r) => r.id as string));
  const existingFingerprints = new Set(existingRows.map(fingerprintFromRow));

  const duplicates: UnifiedTransaction[] = [];
  const unique: UnifiedTransaction[] = [];
  const batchFingerprints = new Set<string>();

  for (const tx of txs) {
    const fp = makeTransactionFingerprint(
      tx.accountId, tx.platform, tx.transactionDate, tx.amount, tx.currency, tx.description,
    );
    const isDup = existingIds.has(tx.id)
      || existingFingerprints.has(fp)
      || batchFingerprints.has(fp);

    if (isDup) duplicates.push(tx);
    else {
      unique.push(tx);
      batchFingerprints.add(fp);
    }
  }

  return { duplicates, unique };
}

export function reassignTransactionId(tx: UnifiedTransaction): UnifiedTransaction {
  const suffix = `_r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return {
    ...tx,
    id: `${tx.id}${suffix}`,
    externalId: tx.externalId ? `${tx.externalId}${suffix}` : undefined,
  };
}
