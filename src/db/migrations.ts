import * as SQLite from 'expo-sqlite';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5 } from './schema';

const LATEST_VERSION = 5;

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
  2: SCHEMA_V2,
  3: SCHEMA_V3,
  4: SCHEMA_V4,
  5: SCHEMA_V5,
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
  // #region agent log
  fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'migrations.ts:23',message:'runMigrations() entered — opening DB',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const database = getDatabase();

  // Читаємо поточну версію
  database.execSync(
    `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)`
  );

  const row = database.getFirstSync<{ version: number }>(
    `SELECT MAX(version) as version FROM _schema_version`
  );
  const currentVersion = row?.version ?? 0;

  // #region agent log
  fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'migrations.ts:34',message:'DB opened, schema version read',data:{currentVersion,latestVersion:LATEST_VERSION},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (currentVersion >= LATEST_VERSION) {
    return; // схема актуальна
  }

  // Виконуємо міграції по порядку
  for (let v = currentVersion + 1; v <= LATEST_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (sql) {
      database.execSync(sql);
      database.runSync(`INSERT INTO _schema_version VALUES (?)`, [v]);
      console.log(`[DB] Migration v${v} applied`);
      // #region agent log
      fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'migrations.ts:46',message:`migration v${v} applied OK`,data:{v},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
  }
}
