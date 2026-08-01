# DATA MODEL — Finance Control v10.2.5

Усі дані зберігаються **виключно у SQLite на пристрої** (`expo-sqlite`). Хмарної БД немає.  
Токени API — в `expo-secure-store`, не в SQLite.

Міграції: `src/db/migrations.ts`. Репозиторії: `src/db/repos/*`.

---

## Основні сутності

| Сутність | Призначення |
|---|---|
| `settings` | Домашня валюта, версія, службові прапорці |
| `accounts` | Рахунки / картки (platform, currency, balance, color…) |
| `transactions` | Уніфіковані операції з усіх джерел |
| `planned_income` | Планер (доходи/витрати, recurrence, статус) |
| `category_rules` | Правила автокатегоризації |
| `custom_categories` | Власні категорії користувача |
| `exchange_rates` / prefs | Курси та список валют віджета |

Деталі колонок і CHECK-обмежень — у SQL нижче (схема еволюціонує міграціями; код — джерело істини).

---

## SQLite схема (базовий контракт)

### `settings`

```sql
CREATE TABLE IF NOT EXISTS settings (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  base_currency  TEXT NOT NULL DEFAULT 'UAH',
  app_version    TEXT NOT NULL DEFAULT '1.0.0',
  last_sync_at   INTEGER
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
```

### `accounts`

```sql
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
```

Додаткові UI-поля (display name, color тощо) додаються міграціями — див. актуальний `migrations.ts`.

### `transactions`

Уніфікована модель: `type` ∈ income / expense / transfer / fee; суми, комісії, категорія, scraper JSON, IBKR trade fields. Дедуплікація за `platform` + `external_id`.

### Планер / правила / категорії

Планові записи, правила матчингу опису→категорія, кастомні категорії з імпактом на транзакції (retag).

---

## Зовнішні дані (не в БД)

| Що | Де |
|---|---|
| Monobank / IBKR токени | Secure Store |
| Біометрія on/off | Secure Store (`biometricPrefs`) |
| Підписи табів | Secure Store (`uiPrefs`) |
| Тема / акцент / анімації | AsyncStorage / theme prefs |

---

## Експорт / скидання

«Небезпечна зона» дозволяє експортувати локальні дані та повністю очистити БД + пов’язані prefs. Після скидання застосунок стартує «з нуля» на пристрої.
