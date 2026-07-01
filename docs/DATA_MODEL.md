# DATA MODEL — Finance Control Mobile App

Усі дані зберігаються **виключно у SQLite на пристрої** (`expo-sqlite`). Жодної хмарної бази немає.

---

## SQLite схема

### Таблиця `settings`
Налаштування застосунку (одна строка).

```sql
CREATE TABLE IF NOT EXISTS settings (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  base_currency  TEXT NOT NULL DEFAULT 'UAH',
  app_version    TEXT NOT NULL DEFAULT '1.0.0',
  last_sync_at   INTEGER  -- Unix timestamp останньої синхронізації
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
```

---

### Таблиця `accounts`
Реєстр усіх рахунків/карт/субрахунків.

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,   -- локальний UUID (crypto.randomUUID())
  platform    TEXT NOT NULL CHECK (platform IN ('monobank','ibkr','privatbank','zen','manual')),
  name        TEXT NOT NULL,      -- 'Mono Чорна', 'IBKR USD', 'Privat UAH' тощо
  currency    TEXT NOT NULL,
  iban        TEXT,
  external_id TEXT,               -- ID рахунку у зовнішній системі
  balance     REAL,               -- останній відомий залишок
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL    -- Unix timestamp
);
```

---

### Таблиця `transactions`
Уніфікована модель для всіх платформ.

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL REFERENCES accounts(id),
  platform         TEXT NOT NULL CHECK (platform IN ('monobank','ibkr','privatbank','zen','manual')),
  external_id      TEXT,           -- ID транзакції у джерелі (для дедуплікації)

  -- Основні фінансові поля
  type             TEXT NOT NULL CHECK (type IN ('income','expense','transfer','fee')),
  amount           REAL NOT NULL,  -- додатне для income, від'ємне для expense
  currency         TEXT NOT NULL,
  amount_base      REAL,           -- конвертовано у base_currency (UAH)
  exchange_rate    REAL,

  -- Комісії
  fee_amount       REAL NOT NULL DEFAULT 0,
  fee_currency     TEXT,
  fee_type         TEXT,           -- 'commission','broker_fee','tax','exchange_fee'

  -- Деталі
  description      TEXT,
  category         TEXT,           -- 'salary','freelance','food','transport' тощо
  mcc              INTEGER,        -- MCC-код (Monobank/PrivatBank)
  counterparty     TEXT,
  direction_from   TEXT,
  direction_to     TEXT,

  -- Метадані
  transaction_date INTEGER NOT NULL, -- Unix timestamp
  imported_at      INTEGER NOT NULL, -- Unix timestamp

  raw_payload      TEXT,           -- JSON-рядок оригінальної відповіді API

  UNIQUE (platform, external_id)   -- захист від дублікатів при повторній синхронізації
);

CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_platform     ON transactions(platform);
CREATE INDEX IF NOT EXISTS idx_tx_type         ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_category     ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_tx_date         ON transactions(transaction_date DESC);
```

---

### Таблиця `planned_income` — Планер майбутніх надходжень

```sql
CREATE TABLE IF NOT EXISTS planned_income (
  id                       TEXT PRIMARY KEY,
  account_id               TEXT NOT NULL REFERENCES accounts(id),

  -- Що очікуємо
  name                     TEXT NOT NULL,  -- 'Зарплата', 'Оплата від Клієнта А'
  amount                   REAL NOT NULL,
  currency                 TEXT NOT NULL,
  source                   TEXT,           -- звідки прийдуть гроші (текстовий опис)
  notes                    TEXT,

  -- Коли очікуємо
  expected_date            INTEGER NOT NULL,    -- Unix timestamp (початок дня)
  notify_days_before       INTEGER NOT NULL DEFAULT 1,

  -- Повторення
  recurrence               TEXT NOT NULL DEFAULT 'once'
                           CHECK (recurrence IN ('once','weekly','monthly','custom')),
  recurrence_day           INTEGER,             -- день місяця (для monthly, 1–31)
  recurrence_interval_days INTEGER,             -- для custom

  -- Статус
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','matched','received_manual','overdue','cancelled')),
  matched_transaction_id   TEXT REFERENCES transactions(id),
  matched_at               INTEGER,             -- Unix timestamp

  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pi_date   ON planned_income(expected_date);
CREATE INDEX IF NOT EXISTS idx_pi_status ON planned_income(status);
```

#### Стан-машина статусів

```
pending ──[auto-match спрацював]──────────────> matched
        ──[дата пройшла, транзакції немає]────> overdue
        ──[користувач вручну підтвердив]──────> received_manual
        ──[скасовано]─────────────────────────> cancelled
```

---

### Таблиця `analytics_cache`
Кеш порахованих агрегацій, щоб не перераховувати при кожному скролі.

```sql
CREATE TABLE IF NOT EXISTS analytics_cache (
  cache_key   TEXT PRIMARY KEY,  -- напр. 'platform:mono:2026-04:income'
  payload     TEXT NOT NULL,     -- JSON-рядок результату
  computed_at INTEGER NOT NULL   -- Unix timestamp, TTL = 30 хв
);
```

---

## SQL-запити для аналітики

Аналітика рахується напряму у SQLite — ніяких зовнішніх сервісів.

### Місячна зведена таблиця

```sql
SELECT
  platform,
  strftime('%Y-%m', datetime(transaction_date, 'unixepoch')) AS month,
  currency,
  SUM(CASE WHEN type = 'income'  THEN amount  ELSE 0 END)        AS total_income,
  SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END)    AS total_expense,
  SUM(fee_amount)                                                  AS total_fees,
  SUM(CASE WHEN type = 'income'  THEN amount  ELSE 0 END)
    - SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END)
    - SUM(fee_amount)                                              AS net_result,
  COUNT(*)                                                         AS tx_count
FROM transactions
WHERE transaction_date BETWEEN :from AND :to
  AND (:platform IS NULL OR platform = :platform)
GROUP BY platform, month, currency
ORDER BY month DESC;
```

### Річна зведена таблиця

```sql
SELECT
  platform,
  strftime('%Y', datetime(transaction_date, 'unixepoch')) AS year,
  currency,
  SUM(CASE WHEN type = 'income'  THEN amount  ELSE 0 END)     AS total_income,
  SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) AS total_expense,
  SUM(fee_amount)                                               AS total_fees,
  SUM(CASE WHEN type = 'income'  THEN amount  ELSE 0 END)
    - SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END)
    - SUM(fee_amount)                                           AS net_result
FROM transactions
WHERE (:platform IS NULL OR platform = :platform)
GROUP BY platform, year, currency
ORDER BY year DESC;
```

### Частка платформ у витратах/доходах

```sql
SELECT
  platform,
  type,
  SUM(ABS(amount)) AS platform_total,
  ROUND(
    SUM(ABS(amount)) * 100.0 /
    SUM(SUM(ABS(amount))) OVER (PARTITION BY type),
    2
  ) AS share_pct
FROM transactions
WHERE transaction_date BETWEEN :from AND :to
GROUP BY platform, type;
```

### Топ категорій витрат

```sql
SELECT
  category,
  SUM(ABS(amount)) AS total,
  COUNT(*)         AS tx_count
FROM transactions
WHERE type = 'expense'
  AND transaction_date BETWEEN :from AND :to
  AND (:platform IS NULL OR platform = :platform)
GROUP BY category
ORDER BY total DESC
LIMIT 10;
```

---

## TypeScript типи

```typescript
export type Platform = 'monobank' | 'ibkr' | 'privatbank' | 'zen' | 'manual';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'fee';

export interface UnifiedTransaction {
  id: string;
  accountId: string;
  platform: Platform;
  externalId?: string;

  type: TransactionType;
  amount: number;       // + для income, - для expense
  currency: string;
  amountBase?: number;  // у base_currency (UAH)
  exchangeRate?: number;

  feeAmount: number;
  feeCurrency?: string;
  feeType?: string;

  description?: string;
  category?: string;
  mcc?: number;
  counterparty?: string;
  directionFrom?: string;
  directionTo?: string;

  transactionDate: Date;
  rawPayload?: unknown;
}

export interface PlannedIncome {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  currency: string;
  source?: string;
  notes?: string;
  expectedDate: Date;
  notifyDaysBefore: number;
  recurrence: 'once' | 'weekly' | 'monthly' | 'custom';
  recurrenceDay?: number;
  recurrenceIntervalDays?: number;
  status: 'pending' | 'matched' | 'received_manual' | 'overdue' | 'cancelled';
  matchedTransactionId?: string;
  matchedAt?: Date;
}

export interface AnalyticsSummary {
  platform?: Platform;
  period: string;        // '2026-04' або '2026'
  currency: string;
  totalIncome: number;
  totalExpense: number;
  totalFees: number;
  netResult: number;
  txCount: number;
}
```

---

## Міграції схеми

Версіювання схеми виконується при кожному запуску застосунку:

```typescript
// src/db/migrations.ts
const MIGRATIONS: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS settings (...);
    CREATE TABLE IF NOT EXISTS accounts (...);
    CREATE TABLE IF NOT EXISTS transactions (...);
    CREATE TABLE IF NOT EXISTS planned_income (...);
    CREATE TABLE IF NOT EXISTS analytics_cache (...);
  `,
  // майбутні міграції додаються тут з наступним номером версії
};

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER)`);
  const result = await db.getFirstAsync<{ version: number }>(
    `SELECT MAX(version) as version FROM _schema_version`
  );
  const currentVersion = result?.version ?? 0;

  for (const [v, sql] of Object.entries(MIGRATIONS)) {
    if (Number(v) > currentVersion) {
      await db.execAsync(sql);
      await db.runAsync(`INSERT INTO _schema_version VALUES (?)`, [Number(v)]);
    }
  }
}
```
