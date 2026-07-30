import * as SQLite from 'expo-sqlite';
import {
  SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5, SCHEMA_V6,
  SCHEMA_V7, SCHEMA_V8, SCHEMA_V9, SCHEMA_V10,
  SCHEMA_V11_CREATE, SCHEMA_V11_INDEXES,
  SCHEMA_V14,
  SCHEMA_V15,
  SCHEMA_V16,
} from './schema';

const LATEST_VERSION = 16;

type Migration = string | ((database: SQLite.SQLiteDatabase) => void);

const MIGRATIONS: Record<number, Migration> = {
  1: SCHEMA_V1,
  2: SCHEMA_V2,
  3: SCHEMA_V3,
  4: SCHEMA_V4,
  5: SCHEMA_V5,
  6: SCHEMA_V6,
  7: SCHEMA_V7,
  8: SCHEMA_V8,
  9: SCHEMA_V9,
  10: SCHEMA_V10,
  11: migrateV11,
  12: migrateV12,
  13: migrateV13,
  14: SCHEMA_V14,
  15: SCHEMA_V15,
  16: migrateV16,
};

let db: SQLite.SQLiteDatabase | null = null;

/** Отримати або відкрити з'єднання з БД (singleton) */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('finance_control.db');
  }
  return db;
}

/** Restore UNIQUE(platform, external_id), add category_locked, drop duplicate rows. */
function migrateV11(database: SQLite.SQLiteDatabase): void {
  const cols = database.getAllSync<{ name: string }>('PRAGMA table_info(transactions)');
  const hasLocked = cols.some((c) => c.name === 'category_locked');
  if (!hasLocked) {
    database.execSync(
      'ALTER TABLE transactions ADD COLUMN category_locked INTEGER NOT NULL DEFAULT 0',
    );
  }

  const dupes = database.getAllSync<{ platform: string; external_id: string; cnt: number }>(
    `SELECT platform, external_id, COUNT(*) AS cnt
     FROM transactions
     WHERE external_id IS NOT NULL AND TRIM(external_id) != ''
     GROUP BY platform, external_id
     HAVING cnt > 1`,
  );

  for (const d of dupes) {
    const rows = database.getAllSync<{ id: string }>(
      `SELECT id FROM transactions
       WHERE platform = ? AND external_id = ?
       ORDER BY imported_at DESC, id DESC`,
      [d.platform, d.external_id],
    );
    for (const row of rows.slice(1)) {
      database.runSync('DELETE FROM transactions WHERE id = ?', [row.id]);
    }
  }

  database.execSync(SCHEMA_V11_CREATE);
  database.execSync(`
    INSERT INTO transactions_v11
      (id, account_id, platform, external_id, type, amount, currency,
       amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
       description, category, tag, category_locked, mcc, counterparty,
       direction_from, direction_to, transaction_date, imported_at, raw_payload)
    SELECT
      id, account_id, platform,
      CASE WHEN external_id IS NULL OR TRIM(external_id) = '' THEN NULL ELSE external_id END,
      type, amount, currency,
      amount_base, exchange_rate, fee_amount, fee_currency, fee_type,
      description, category, tag, COALESCE(category_locked, 0), mcc, counterparty,
      direction_from, direction_to, transaction_date, imported_at, raw_payload
    FROM transactions;
  `);
  database.execSync('DROP TABLE transactions');
  database.execSync('ALTER TABLE transactions_v11 RENAME TO transactions');
  database.execSync(SCHEMA_V11_INDEXES);
}

/** Collapse fingerprint duplicates that share no external_id. */
function migrateV12(database: SQLite.SQLiteDatabase): void {
  // Inline fingerprint dedupe (avoid circular import with utils during migration)
  const rows = database.getAllSync<{
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

  const seen = new Set<string>();
  for (const row of rows) {
    const minute = Math.floor(row.transaction_date / 60_000);
    const amt = Math.round(row.amount * 100) / 100;
    const desc = (row.description ?? '').trim().toLowerCase().slice(0, 120);
    const fp = `${row.platform}|${row.account_id}|${minute}|${amt}|${row.currency}|${desc}`;
    if (seen.has(fp)) {
      database.runSync('DELETE FROM transactions WHERE id = ?', [row.id]);
    } else {
      seen.add(fp);
    }
  }

  // Investments are capital flows — never income/expense in P&L
  database.runSync(
    `UPDATE transactions
     SET type = 'transfer'
     WHERE (tag = 'investment' OR (tag IS NULL AND category = 'investment'))
       AND type IN ('income', 'expense')
       AND description NOT LIKE 'SELL %'`,
  );
}

/** Drop unused analytics_cache (never written/read; compute is in-memory). */
function migrateV13(database: SQLite.SQLiteDatabase): void {
  database.execSync('DROP TABLE IF EXISTS analytics_cache');
}

/** Hidden builtins + widen custom_categories.impact to include fee. */
function migrateV16(database: SQLite.SQLiteDatabase): void {
  database.execSync(SCHEMA_V16);
  database.execSync(`
    CREATE TABLE IF NOT EXISTS custom_categories_v16 (
      id         TEXT PRIMARY KEY,
      key        TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL,
      impact     TEXT NOT NULL CHECK (impact IN ('expense','income','neutral','fee')),
      created_at INTEGER NOT NULL
    );
  `);
  try {
    database.execSync(`
      INSERT OR IGNORE INTO custom_categories_v16 (id, key, name, color, impact, created_at)
      SELECT id, key, name, color, impact, created_at FROM custom_categories;
    `);
    database.execSync('DROP TABLE IF EXISTS custom_categories');
    database.execSync('ALTER TABLE custom_categories_v16 RENAME TO custom_categories');
    database.execSync('CREATE INDEX IF NOT EXISTS idx_custom_cat_key ON custom_categories(key)');
  } catch (e) {
    console.warn('[DB] custom_categories impact widen skipped:', e);
  }
}

/** Запустити всі необхідні міграції */
export async function runMigrations(): Promise<void> {
  const database = getDatabase();

  database.execSync(
    `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)`,
  );

  const row = database.getFirstSync<{ version: number }>(
    `SELECT MAX(version) as version FROM _schema_version`,
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion >= LATEST_VERSION) {
    return;
  }

  for (let v = currentVersion + 1; v <= LATEST_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) continue;

    if (typeof migration === 'string') {
      database.execSync(migration);
    } else {
      database.withTransactionSync(() => migration(database));
    }
    database.runSync(`INSERT INTO _schema_version VALUES (?)`, [v]);
    console.log(`[DB] Migration v${v} applied`);
  }

  // Idempotent: investments must never sit in income/expense P&L buckets
  try {
    database.runSync(
      `UPDATE transactions
       SET type = 'transfer'
       WHERE (tag = 'investment' OR (tag IS NULL AND category = 'investment'))
         AND type IN ('income', 'expense')
         AND description NOT LIKE 'SELL %'`,
    );
  } catch (e) {
    console.warn('[DB] investment type normalize skipped:', e);
  }
}
