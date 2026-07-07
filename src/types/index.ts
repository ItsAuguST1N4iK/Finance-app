// ─────────────────────────────────────────────
// Базові перерахування
// ─────────────────────────────────────────────

/**
 * Платформа-джерело транзакції.
 * 'manual' — введено вручну користувачем.
 */
export type Platform =
  | 'monobank'
  | 'ibkr'
  | 'privatbank'
  | 'zen'
  | 'manual';

/**
 * Тип фінансової події:
 * income   — надходження (+ до балансу)
 * expense  — витрата (- від балансу)
 * transfer — переказ між власними рахунками
 * fee      — комісія / збір
 */
export type TransactionType = 'income' | 'expense' | 'transfer' | 'fee';

/**
 * Статус планового надходження.
 */
export type PlannedIncomeStatus =
  | 'pending'          // очікується
  | 'matched'          // автоматично зіставлено з транзакцією
  | 'received_manual'  // підтверджено вручну
  | 'overdue'          // дата пройшла, гроші не прийшли
  | 'cancelled';       // скасовано

export type RecurrenceType = 'once' | 'weekly' | 'monthly' | 'custom';

// ─────────────────────────────────────────────
// Рахунок / картка
// ─────────────────────────────────────────────

export interface Account {
  id: string;
  platform: Platform;
  name: string;        // 'Mono Чорна', 'IBKR USD'
  currency: string;    // ISO 4217: 'UAH', 'USD', 'EUR'
  iban?: string;
  externalId?: string; // ID у зовнішній системі (Monobank account id тощо)
  balance?: number;    // останній відомий залишок
  isActive: boolean;
  createdAt: number;   // Unix timestamp (ms)
  displayName?: string; // user-editable label shown under card number
  color?: string;       // user-chosen hex color for the card
}

// ─────────────────────────────────────────────
// Уніфікована транзакція
// ─────────────────────────────────────────────

export interface UnifiedTransaction {
  id: string;
  accountId: string;
  platform: Platform;
  externalId?: string; // ID у джерелі (для дедуплікації)

  type: TransactionType;
  amount: number;      // + для income, - для expense
  currency: string;
  amountBase?: number; // конвертовано у base_currency (UAH)
  exchangeRate?: number;

  // Комісії — зберігаються окремо, не зменшують amount
  feeAmount: number;
  feeCurrency?: string;
  feeType?: string;    // 'commission' | 'broker_fee' | 'tax' | 'exchange_fee' | ...

  description?: string;
  category?: string;   // 'salary' | 'food' | 'dividend' | ...
  tag?: string;        // auto or manually assigned tag
  mcc?: number;        // MCC-код картки (Monobank/PrivatBank)
  counterparty?: string;
  directionFrom?: string;
  directionTo?: string;

  transactionDate: number; // Unix timestamp (ms)
  importedAt: number;
  rawPayload?: string;     // JSON рядок оригінальної відповіді API
}

// ─────────────────────────────────────────────
// Планер майбутніх надходжень
// ─────────────────────────────────────────────

export interface PlannedIncome {
  id: string;
  accountId: string;

  planType: 'income' | 'expense'; // тип: надходження або витрата
  name: string;        // 'Зарплата', 'Оплата від Клієнта А'
  amount: number;
  currency: string;
  source?: string;     // текстовий опис звідки прийдуть гроші
  notes?: string;

  expectedDate: number;        // Unix timestamp початку дня
  notifyDaysBefore: number;    // за скільки днів нагадати

  recurrence: RecurrenceType;
  recurrenceDay?: number;           // день місяця (1–31) для 'monthly'
  recurrenceIntervalDays?: number;  // для 'custom'

  status: PlannedIncomeStatus;
  matchedTransactionId?: string;
  matchedAt?: number;  // Unix timestamp

  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────
// Аналітика
// ─────────────────────────────────────────────

export interface AnalyticsSummary {
  platform?: Platform; // undefined = всі платформи разом
  period: string;      // '2026-04' (місяць) або '2026' (рік)
  currency: string;
  totalIncome: number;
  totalExpense: number;
  totalFees: number;
  netResult: number;   // income - expense - fees
  txCount: number;
}

export interface PlatformShare {
  accountId: string;
  accountName: string;
  platform: Platform;
  type: 'income' | 'expense';
  platformTotal: number;
  sharePct: number;    // 0–100
  color?: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
  txCount: number;
}

// ─────────────────────────────────────────────
// Налаштування застосунку
// ─────────────────────────────────────────────

export interface AppSettings {
  baseCurrency: string; // 'UAH'
  appVersion: string;
  lastSyncAt?: number;  // Unix timestamp
}

// ─────────────────────────────────────────────
// Фільтри для аналітики
// ─────────────────────────────────────────────

export interface AnalyticsFilters {
  platforms: Platform[];             // [] = всі
  types: TransactionType[];          // [] = всі
  currency?: string;
  dateFrom: number;                  // Unix timestamp
  dateTo: number;
  periodPreset?: 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all' | 'custom';
  chartMode?: 'daily' | 'monthly';   // for year view: daily vs monthly buckets
  chartType?: 'income' | 'expense';  // which series to show in chart
  excludeSelfTransfers?: boolean;    // exclude self-transfer tagged transactions
}

export interface ExchangeRate {
  currencyCode: string;
  rateBuy: number;
  rateSell: number;
  updatedAt: number;
}
