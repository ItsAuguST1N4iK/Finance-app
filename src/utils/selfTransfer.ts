import type { Account } from '../types';

export interface OwnAccountContext {
  ibans: string[];
  names: string[];
  last4Digits: string[];
}

export function buildOwnAccountContext(accounts: Account[]): OwnAccountContext {
  const ibans: string[] = [];
  const names: string[] = [];
  const last4Digits: string[] = [];

  for (const acc of accounts) {
    if (acc.iban) ibans.push(acc.iban);
    if (acc.name) names.push(acc.name);
    if (acc.displayName) names.push(acc.displayName);

    const panMatch = acc.name?.match(/(\d{4})\s*$/);
    if (panMatch) last4Digits.push(panMatch[1]);
    const ibanLast = acc.iban?.replace(/\s/g, '').slice(-4);
    if (ibanLast && /^\d{4}$/.test(ibanLast)) last4Digits.push(ibanLast);
  }

  return {
    ibans: [...new Set(ibans)],
    names: [...new Set(names.filter((n) => n.length > 2))],
    last4Digits: [...new Set(last4Digits)],
  };
}

const SELF_TRANSFER_PATTERNS = [
  /^на картку$/i,
  /на свою карт/i,
  /між власн/i,
  /переказ на карт/i,
  /own account/i,
  /self.?transfer/i,
  /between own/i,
  /p2p.*own/i,
  /^transfer to card$/i,
  /^from (black|white|platinum|iron|yellow|eur|usd|diia)\b/i,
  /^from .+ card$/i,
  /між своїми карт/i,
];

/** Escape a literal for use inside RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when `name` appears as its own token in `text`.
 * Prevents "ZEN" matching inside "ZENMARKET".
 */
export function accountNameAppearsInText(name: string, text: string): boolean {
  const n = name.trim().toLowerCase();
  if (n.length < 3) return false;
  const escaped = escapeRegExp(n);
  // Boundary: start/end or non-letter/digit (Latin + Ukrainian)
  const re = new RegExp(
    `(^|[^a-z0-9а-яіїєґё])${escaped}([^a-z0-9а-яіїєґё]|$)`,
    'i',
  );
  return re.test(text);
}

/** Returns true when transaction is a transfer between the user's own accounts/cards. */
export function isSelfTransfer(
  description: string | undefined,
  counterparty: string | undefined,
  counterIban: string | undefined,
  ctx: OwnAccountContext,
): boolean {
  if (counterIban && ctx.ibans.some((iban) => iban === counterIban)) {
    return true;
  }

  const text = `${description ?? ''} ${counterparty ?? ''}`.toLowerCase();

  for (const iban of ctx.ibans) {
    const normalized = iban.replace(/\s/g, '').toLowerCase();
    if (normalized.length > 8 && text.includes(normalized)) return true;
  }

  for (const name of ctx.names) {
    if (accountNameAppearsInText(name, text)) return true;
  }

  for (const last4 of ctx.last4Digits) {
    // Require masked PAN (**1234) or explicit card + last4 — avoid bare "card … 1234" false positives
    if (
      new RegExp(
        `\\*{2,}\\s*${last4}\\b|\\bкарт(?:ка|ки|ку|ці)?\\s*[#*]*\\s*${last4}\\b|\\bcard\\s*[#*]*\\s*${last4}\\b`,
        'i',
      ).test(text)
    ) {
      return true;
    }
  }

  return SELF_TRANSFER_PATTERNS.some((p) => p.test(text));
}
