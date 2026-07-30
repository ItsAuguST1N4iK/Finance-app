import { getDatabase } from '../db/migrations';
import { makeTransactionFingerprint } from './dedup';

/**
 * Remove exact fingerprint / external_id duplicates that slipped in.
 * Keeps the newest imported_at. Does NOT soft-match near times —
 * intentional near-duplicates (e.g. several 0.01 transfers) must survive.
 */
export function dedupeTransactionsInDb(): { byExternal: number; byFingerprint: number } {
  const db = getDatabase();
  let byExternal = 0;
  let byFingerprint = 0;

  db.withTransactionSync(() => {
    const extDupes = db.getAllSync<{ platform: string; external_id: string; cnt: number }>(
      `SELECT platform, external_id, COUNT(*) AS cnt
       FROM transactions
       WHERE external_id IS NOT NULL AND TRIM(external_id) != ''
       GROUP BY platform, external_id
       HAVING cnt > 1`,
    );
    for (const d of extDupes) {
      const rows = db.getAllSync<{ id: string }>(
        `SELECT id FROM transactions
         WHERE platform = ? AND external_id = ?
         ORDER BY imported_at DESC, id DESC`,
        [d.platform, d.external_id],
      );
      for (const row of rows.slice(1)) {
        db.runSync('DELETE FROM transactions WHERE id = ?', [row.id]);
        byExternal++;
      }
    }

    const rows = db.getAllSync<{
      id: string;
      account_id: string;
      platform: string;
      transaction_date: number;
      amount: number;
      currency: string;
      description: string | null;
    }>(
      `SELECT id, account_id, platform, transaction_date, amount, currency, description
       FROM transactions
       ORDER BY imported_at DESC, id DESC`,
    );

    const seenFp = new Set<string>();
    for (const row of rows) {
      const fp = makeTransactionFingerprint(
        row.account_id,
        row.platform as 'monobank' | 'ibkr' | 'privatbank' | 'zen' | 'manual',
        row.transaction_date,
        row.amount,
        row.currency,
        row.description ?? undefined,
      );
      if (seenFp.has(fp)) {
        db.runSync('DELETE FROM transactions WHERE id = ?', [row.id]);
        byFingerprint++;
      } else {
        seenFp.add(fp);
      }
    }
  });

  return { byExternal, byFingerprint };
}
