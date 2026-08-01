import type { Platform } from '../types';

/** Exact-minute fingerprint — used for stable import IDs and import-time dup checks. */
export function makeTransactionFingerprint(
  accountId: string,
  platform: Platform,
  transactionDate: number,
  amount: number,
  currency: string,
  description?: string,
): string {
  const minute = Math.floor(transactionDate / 60_000);
  const amt = Math.round(amount * 100) / 100;
  const desc = (description ?? '').trim().toLowerCase().slice(0, 120);
  return `${platform}|${accountId}|${minute}|${amt}|${currency}|${desc}`;
}

/** Deterministic external id from fingerprint — same tx always maps to same id. */
export function fingerprintToExternalId(fingerprint: string): string {
  let hash = 5381;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = ((hash << 5) + hash) ^ fingerprint.charCodeAt(i);
  }
  return `fp_${(hash >>> 0).toString(36)}`;
}

/** Stable ids for newly parsed import rows only. */
export function makeStableTransactionIds(
  accountId: string,
  platform: Platform,
  transactionDate: number,
  amount: number,
  currency: string,
  description?: string,
  preferredExternalId?: string,
): { id: string; externalId: string; fingerprint: string } {
  const fingerprint = makeTransactionFingerprint(
    accountId, platform, transactionDate, amount, currency, description,
  );
  const externalId = preferredExternalId ?? fingerprintToExternalId(fingerprint);
  const id = `${platform}_${externalId}`;
  return { id, externalId, fingerprint };
}
