import type { Account, Platform } from '../types';
import { useAccountsStore } from '../store/accountsSlice';
import { CARD_COLORS } from '../constants/cardColors';

const PLATFORM_COLOR: Partial<Record<Platform, string>> = {
  monobank: CARD_COLORS[0],
  privatbank: CARD_COLORS[4],
  zen: CARD_COLORS[2],
  ibkr: CARD_COLORS[1],
  manual: CARD_COLORS[8],
};

export interface EnsureAccountOpts {
  name?: string;
  currency?: string;
  iban?: string;
  externalId?: string;
  color?: string;
  /** Prefer this existing account when still valid for the platform (+ currency) */
  preferredId?: string | null;
}

function defaultName(
  platform: Platform,
  currency: string,
  externalId?: string,
  iban?: string,
): string {
  switch (platform) {
    case 'monobank':
      return `Monobank ${currency}`;
    case 'privatbank':
      return `PrivatBank ${currency}`;
    case 'zen':
      return iban ? `ZEN ${iban.slice(-4)}` : `ZEN ${currency}`;
    case 'ibkr':
      return externalId ? `IBKR ${externalId}` : `IBKR ${currency}`;
    default:
      return `${platform} ${currency}`;
  }
}

function last4Digits(value?: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function currencyMatches(account: Account, wanted?: string): boolean {
  if (!wanted) return true;
  return (account.currency || 'UAH').toUpperCase() === wanted.toUpperCase();
}

/**
 * Find an existing account for import or create one from file metadata.
 * Never attaches a foreign-currency statement to a different-currency card.
 */
export function ensureImportAccount(
  platform: Platform,
  opts: EnsureAccountOpts = {},
): Account {
  const store = useAccountsStore.getState();
  const all = store.accounts;
  const wantedCurrency = opts.currency?.trim().toUpperCase() || undefined;
  const platformAccounts = all.filter(
    (a) => a.id !== 'acc_default' && a.platform === platform && a.isActive,
  );

  if (opts.preferredId) {
    const preferred = all.find(
      (a) => a.id === opts.preferredId && a.platform === platform && a.isActive,
    );
    if (preferred && currencyMatches(preferred, wantedCurrency)) return preferred;
  }

  if (opts.externalId) {
    const byExt = all.find(
      (a) => a.platform === platform && a.externalId === opts.externalId && a.isActive,
    );
    if (byExt) {
      // Keep identity; currency on account may still need a user edit, but do not
      // silently merge a different-currency file into the wrong card when another
      // same-platform account with the right currency exists.
      if (currencyMatches(byExt, wantedCurrency)) return byExt;
      const alt = platformAccounts.find(
        (a) => a.id !== byExt.id && currencyMatches(a, wantedCurrency),
      );
      if (alt) return alt;
      if (!wantedCurrency) return byExt;
    }
  }

  if (opts.iban) {
    const byIban = all.find((a) => a.iban === opts.iban && a.isActive);
    if (byIban && currencyMatches(byIban, wantedCurrency)) return byIban;
  }

  const cardLast4 = last4Digits(opts.name) ?? last4Digits(opts.externalId);
  if (cardLast4) {
    const byCard = platformAccounts.find((a) => {
      if (!currencyMatches(a, wantedCurrency)) return false;
      const hay = `${a.name} ${a.displayName ?? ''} ${a.externalId ?? ''}`;
      return last4Digits(hay) === cardLast4 || hay.includes(cardLast4);
    });
    if (byCard) return byCard;
  }

  // Reuse existing platform card only when currency matches (or unknown).
  if (!opts.externalId && !opts.iban) {
    const sameCurrency = wantedCurrency
      ? platformAccounts.find((a) => currencyMatches(a, wantedCurrency))
      : platformAccounts[0];
    if (sameCurrency) return sameCurrency;
  }

  const currency = wantedCurrency || 'UAH';
  const name = opts.name?.trim()
    || defaultName(platform, currency, opts.externalId, opts.iban);

  return store.addAccount({
    platform,
    name,
    displayName: name,
    currency,
    iban: opts.iban,
    externalId: opts.externalId,
    balance: undefined,
    isActive: true,
    color: opts.color ?? PLATFORM_COLOR[platform] ?? CARD_COLORS[0],
  });
}
