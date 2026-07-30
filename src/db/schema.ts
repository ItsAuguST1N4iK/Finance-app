/**
 * SQL-визначення всіх таблиць SQLite.
 *
 * Чому SQLite, а не хмарна БД?
 * Весь застосунок працює повністю на пристрої — жодного сервера.
 * SQLite — вбудована БД, файл якої зберігається в захищеному
 * сховищі пристрою і недоступний іншим застосункам.
 */

export const SCHEMA_V2 = `
  ALTER TABLE settings ADD COLUMN theme        TEXT DEFAULT 'dark';
  ALTER TABLE settings ADD COLUMN accent_color TEXT DEFAULT '#3b82f6';

  INSERT OR IGNORE INTO accounts
    (id, platform, name, currency, is_active, created_at)
  VALUES
    ('acc_default', 'manual', 'Загальний рахунок', 'UAH', 1,
     CAST(strftime('%s','now') AS INTEGER) * 1000);
`;

export const SCHEMA_V3 = `
  ALTER TABLE settings ADD COLUMN language             TEXT DEFAULT 'uk';
  ALTER TABLE settings ADD COLUMN preferred_currencies TEXT DEFAULT '["USD","EUR","GBP"]';
  ALTER TABLE accounts ADD COLUMN color                TEXT;
  ALTER TABLE accounts ADD COLUMN display_name         TEXT;
`;

export const SCHEMA_V4 = `
  ALTER TABLE settings ADD COLUMN base_currency_exchange TEXT DEFAULT 'UAH';
`;

export const SCHEMA_V5 = `
  ALTER TABLE settings ADD COLUMN home_currency TEXT DEFAULT 'UAH';
  ALTER TABLE planned_income ADD COLUMN plan_type TEXT DEFAULT 'income';
`;

export const SCHEMA_V6 = `
  ALTER TABLE transactions ADD COLUMN tag TEXT;
  CREATE INDEX IF NOT EXISTS idx_tx_tag ON transactions(tag);
`;

export const SCHEMA_V7 = `
  CREATE TABLE transactions_new (
    id               TEXT PRIMARY KEY,
    account_id       TEXT NOT NULL REFERENCES accounts(id),
    platform         TEXT NOT NULL CHECK (platform IN ('monobank','ibkr','privatbank','zen','manual')),
    external_id      TEXT,
    type             TEXT NOT NULL CHECK (type IN ('income','expense','transfer','fee')),
    amount           REAL NOT NULL,
    currency         TEXT NOT NULL,
    amount_base      REAL,
    exchange_rate    REAL,
    fee_amount       REAL NOT NULL DEFAULT 0,
    fee_currency     TEXT,
    fee_type         TEXT,
    description      TEXT,
    category         TEXT,
    tag              TEXT,
    mcc              INTEGER,
    counterparty     TEXT,
    direction_from   TEXT,
    direction_to     TEXT,
    transaction_date INTEGER NOT NULL,
    imported_at      INTEGER NOT NULL,
    raw_payload      TEXT
  );

  INSERT INTO transactions_new
    (id, account_id, platform, external_id, type, amount, currency,
     amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
     description, category, tag, mcc, counterparty, direction_from, direction_to,
     transaction_date, imported_at, raw_payload)
  SELECT
    id, account_id, platform, external_id, type, amount, currency,
    amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
    description, category, tag, mcc, counterparty, direction_from, direction_to,
    transaction_date, imported_at, raw_payload
  FROM transactions;

  DROP TABLE transactions;
  ALTER TABLE transactions_new RENAME TO transactions;

  CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_platform     ON transactions(platform);
  CREATE INDEX IF NOT EXISTS idx_tx_type         ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_tx_date         ON transactions(transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_tag          ON transactions(tag);
`;

export const SCHEMA_V9 = `
  CREATE TABLE IF NOT EXISTS category_rules (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    category_key TEXT NOT NULL,
    priority     INTEGER NOT NULL DEFAULT 0,
    match_field  TEXT NOT NULL CHECK (match_field IN ('mcc','description','amount','platform','type')),
    match_op     TEXT NOT NULL CHECK (match_op IN ('contains','equals','regex','range')),
    match_value  TEXT NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cat_rules_prio ON category_rules(priority DESC);
`;

export const SCHEMA_V10 = `
  CREATE TABLE IF NOT EXISTS category_rules_new (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    category_key TEXT NOT NULL,
    priority     INTEGER NOT NULL DEFAULT 0,
    match_field  TEXT NOT NULL,
    match_op     TEXT NOT NULL,
    match_value  TEXT NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL
  );
  INSERT INTO category_rules_new SELECT * FROM category_rules;
  DROP TABLE category_rules;
  ALTER TABLE category_rules_new RENAME TO category_rules;
  CREATE INDEX IF NOT EXISTS idx_cat_rules_prio ON category_rules(priority DESC);
`;

export const SCHEMA_V8 = `
  ALTER TABLE settings ADD COLUMN animation_speed REAL DEFAULT 1.0;
  ALTER TABLE settings ADD COLUMN glass_opacity   REAL DEFAULT 0.72;
  ALTER TABLE settings ADD COLUMN liquid_glass    INTEGER DEFAULT 1;
`;

/**
 * SCHEMA_V7 rebuilt transactions without UNIQUE(platform, external_id).
 * V11 restores uniqueness, adds category_locked for manual tag protection,
 * and is applied via a function migration (dupe cleanup + table rebuild).
 */
export const SCHEMA_V11_CREATE = `
  CREATE TABLE transactions_v11 (
    id               TEXT PRIMARY KEY,
    account_id       TEXT NOT NULL REFERENCES accounts(id),
    platform         TEXT NOT NULL CHECK (platform IN ('monobank','ibkr','privatbank','zen','manual')),
    external_id      TEXT,
    type             TEXT NOT NULL CHECK (type IN ('income','expense','transfer','fee')),
    amount           REAL NOT NULL,
    currency         TEXT NOT NULL,
    amount_base      REAL,
    exchange_rate    REAL,
    fee_amount       REAL NOT NULL DEFAULT 0,
    fee_currency     TEXT,
    fee_type         TEXT,
    description      TEXT,
    category         TEXT,
    tag              TEXT,
    category_locked  INTEGER NOT NULL DEFAULT 0,
    mcc              INTEGER,
    counterparty     TEXT,
    direction_from   TEXT,
    direction_to     TEXT,
    transaction_date INTEGER NOT NULL,
    imported_at      INTEGER NOT NULL,
    raw_payload      TEXT,
    UNIQUE (platform, external_id)
  );
`;

export const SCHEMA_V11_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_platform     ON transactions(platform);
  CREATE INDEX IF NOT EXISTS idx_tx_type         ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_tx_date         ON transactions(transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_tag          ON transactions(tag);
  CREATE INDEX IF NOT EXISTS idx_tx_external     ON transactions(platform, external_id);
`;

export const SCHEMA_V1 = `
  -- Версіювання схеми (для майбутніх міграцій)
  CREATE TABLE IF NOT EXISTS _schema_version (
    version INTEGER NOT NULL
  );

  -- Налаштування застосунку (завжди рівно один рядок з id=1)
  CREATE TABLE IF NOT EXISTS settings (
    id             INTEGER PRIMARY KEY CHECK (id = 1),
    base_currency  TEXT NOT NULL DEFAULT 'UAH',
    app_version    TEXT NOT NULL DEFAULT '1.0.0',
    last_sync_at   INTEGER
  );
  INSERT OR IGNORE INTO settings (id) VALUES (1);

  -- Рахунки: картки, депозити, брокерські субрахунки
  CREATE TABLE IF NOT EXISTS accounts (
    id          TEXT PRIMARY KEY,
    platform    TEXT NOT NULL CHECK (platform IN ('monobank','ibkr','privatbank','zen','manual')),
    name        TEXT NOT NULL,
    currency    TEXT NOT NULL,
    iban        TEXT,
    external_id TEXT,
    balance     REAL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL
  );

  -- Уніфіковані транзакції з усіх платформ
  CREATE TABLE IF NOT EXISTS transactions (
    id               TEXT PRIMARY KEY,
    account_id       TEXT NOT NULL REFERENCES accounts(id),
    platform         TEXT NOT NULL CHECK (platform IN ('monobank','ibkr','privatbank','zen','manual')),
    external_id      TEXT,

    type             TEXT NOT NULL CHECK (type IN ('income','expense','transfer','fee')),
    amount           REAL NOT NULL,
    currency         TEXT NOT NULL,
    amount_base      REAL,
    exchange_rate    REAL,

    fee_amount       REAL NOT NULL DEFAULT 0,
    fee_currency     TEXT,
    fee_type         TEXT,

    description      TEXT,
    category         TEXT,
    mcc              INTEGER,
    counterparty     TEXT,
    direction_from   TEXT,
    direction_to     TEXT,

    transaction_date INTEGER NOT NULL,
    imported_at      INTEGER NOT NULL,
    raw_payload      TEXT,

    UNIQUE (platform, external_id)
  );

  -- Індекси для швидкого пошуку
  CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_platform     ON transactions(platform);
  CREATE INDEX IF NOT EXISTS idx_tx_type         ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_tx_date         ON transactions(transaction_date DESC);

  -- Планові надходження
  CREATE TABLE IF NOT EXISTS planned_income (
    id                       TEXT PRIMARY KEY,
    account_id               TEXT NOT NULL REFERENCES accounts(id),

    name                     TEXT NOT NULL,
    amount                   REAL NOT NULL,
    currency                 TEXT NOT NULL,
    source                   TEXT,
    notes                    TEXT,

    expected_date            INTEGER NOT NULL,
    notify_days_before       INTEGER NOT NULL DEFAULT 1,

    recurrence               TEXT NOT NULL DEFAULT 'once'
                             CHECK (recurrence IN ('once','weekly','monthly','custom')),
    recurrence_day           INTEGER,
    recurrence_interval_days INTEGER,

    status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','matched','received_manual','overdue','cancelled')),
    matched_transaction_id   TEXT REFERENCES transactions(id),
    matched_at               INTEGER,

    created_at               INTEGER NOT NULL,
    updated_at               INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pi_date   ON planned_income(expected_date);
  CREATE INDEX IF NOT EXISTS idx_pi_status ON planned_income(status);
`;

/** Custom user-defined tags/categories with P&L impact. */
export const SCHEMA_V14 = `
  CREATE TABLE IF NOT EXISTS custom_categories (
    id         TEXT PRIMARY KEY,
    key        TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL,
    impact     TEXT NOT NULL CHECK (impact IN ('expense','income','neutral','fee')),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_custom_cat_key ON custom_categories(key);
`;

/** Tombstones for user-deleted built-in scraper rules (so ensure won't recreate them). */
export const SCHEMA_V15 = `
  CREATE TABLE IF NOT EXISTS deleted_scraper_rules (
    id TEXT PRIMARY KEY
  );
`;

/** Hidden builtins + allow impact=fee on custom_categories. */
export const SCHEMA_V16 = `
  CREATE TABLE IF NOT EXISTS hidden_categories (
    key TEXT PRIMARY KEY
  );
`;
