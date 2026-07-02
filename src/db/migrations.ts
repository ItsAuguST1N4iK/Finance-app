import * as SQLite from 'expo-sqlite';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5, SCHEMA_V6 } from './schema';

const LATEST_VERSION = 6;

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
  2: SCHEMA_V2,
  3: SCHEMA_V3,
  4: SCHEMA_V4,
  5: SCHEMA_V5,
  6: SCHEMA_V6,
};

let db: SQLite.SQLiteDatabase | null = null;

/** Отримати або відкрити з'єднання з БД (singleton) */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('finance_control.db');
  }
  return db;
}

/** Запустити всі необхідні міграції */
export async function runMigrations(): Promise<void> {
  const database = getDatabase();

  database.execSync(
    `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)`
  );

  const row = database.getFirstSync<{ version: number }>(
    `SELECT MAX(version) as version FROM _schema_version`
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion >= LATEST_VERSION) {
    return;
  }

  for (let v = currentVersion + 1; v <= LATEST_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (sql) {
      database.execSync(sql);
      database.runSync(`INSERT INTO _schema_version VALUES (?)`, [v]);
      console.log(`[DB] Migration v${v} applied`);
    }
  }
}
