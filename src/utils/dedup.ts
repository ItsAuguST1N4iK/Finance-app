import type { Platform } from '../types';

/** Exact-minute fingerprint (legacy / stable IDs). */
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

/**
 * Currency/account-agnostic key — finds the same bank row after a currency
 * mis-label fix or when the tx is moved to the correct card.
 */
export function makeLooseTransactionFingerprint(
  platform: Platform,
  transactionDate: number,
  amount: number,
  description?: string,
): string {
  const minute = Math.floor(transactionDate / 60_000);
  const amt = Math.round(amount * 100) / 100;
  const desc = (description ?? '').trim().toLowerCase().slice(0, 120);
  return `${platform}|${minute}|${amt}|${desc}`;
}

/** Soft match: same platform+amount+desc within this window (±). */
export const DEDUP_WINDOW_MS = 5 * 60_000;

export function makeSoftDupKey(
  platform: Platform,
  amount: number,
  description?: string,
): string {
  const amt = Math.round(amount * 100) / 100;
  const desc = (description ?? '').trim().toLowerCase().slice(0, 120);
  return `${platform}|${amt}|${desc}`;
}

export function isWithinDedupWindow(a: number, b: number, windowMs = DEDUP_WINDOW_MS): boolean {
  return Math.abs(a - b) <= windowMs;
}

/** Deterministic external id from fingerprint — same tx always maps to same id. */
export function fingerprintToExternalId(fingerprint: string): string {
  let hash = 5381;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = ((hash << 5) + hash) ^ fingerprint.charCodeAt(i);
  }
  return `fp_${(hash >>> 0).toString(36)}`;
}

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
