# Zen.com Integration

## Доступні методи

| Метод | Тип акаунту | Автоматично | MVP |
|---|---|---|---|
| **CSV/PDF ручний імпорт** | Особистий | Ні | ✅ |
| **Payments API** | Merchant | Так | Майбутнє (v2.0) |

---

## 1. CSV Ручний імпорт (особистий акаунт)

Zen.com для особистих акаунтів не надає публічного API. Єдиний спосіб отримати транзакції — **ручний експорт виписки** через вебсайт або застосунок.

### Як експортувати виписку

1. Відкрийте [zen.com](https://zen.com) → увійдіть у свій акаунт
2. Перейдіть у розділ **Transactions** / **Statement**
3. Оберіть діапазон дат та рахунок (картка / IBAN)
4. Натисніть **Export** → формат **CSV** або **PDF**
5. Завантажений файл передайте у застосунок через кнопку «Імпортувати виписку»

---

## 2. Формат CSV від Zen.com

Zen.com використовує наступний формат (може варіюватися залежно від версії):

```
Date;Description;Amount;Currency;Balance;Type
2026-04-01;Payment to Amazon;-45.99;EUR;1054.01;CARD_PAYMENT
2026-04-02;Salary from Employer;3500.00;EUR;4554.01;INCOMING_TRANSFER
2026-04-03;Zen Card fee;-2.99;EUR;4551.02;FEE
2026-04-04;Currency exchange USD to EUR;-100.00;USD;4551.02;EXCHANGE
```

> Zen може додати або перейменувати колонки — рекомендується перевіряти актуальний формат перед релізом.

### Типи транзакцій у CSV

| `Type` | Наш `type` | Примітка |
|---|---|---|
| `CARD_PAYMENT` | `expense` | Платіж карткою |
| `INCOMING_TRANSFER` | `income` | Вхідний переказ |
| `OUTGOING_TRANSFER` | `expense` | Вихідний переказ |
| `FEE` | `fee` | Комісія Zen |
| `EXCHANGE` | `expense` або `income` | Валютний обмін (дивитись на знак суми) |
| `REFUND` | `income` | Повернення коштів |
| `ATM_WITHDRAWAL` | `expense` | Зняття готівки |

---

## 3. Парсинг CSV (backend)

```typescript
import { parse } from 'csv-parse/sync';

interface ZenCSVRow {
  Date: string;
  Description: string;
  Amount: string;
  Currency: string;
  Balance: string;
  Type: string;
}

function parseZenCSV(csvContent: string, accountId: string): UnifiedTransaction[] {
  // Zen CSV може мати BOM, видаляємо
  const cleaned = csvContent.replace(/^\uFEFF/, '');

  const rows: ZenCSVRow[] = parse(cleaned, {
    delimiter: ';',
    columns: true,
    skipEmptyLines: true,
    trim: true,
  });

  return rows.map((row) => mapZenRow(row, accountId)).filter(Boolean);
}

function mapZenRow(row: ZenCSVRow, accountId: string): UnifiedTransaction {
  const amount = parseFloat(row.Amount.replace(',', '.'));
  const isFee  = row.Type === 'FEE';

  return {
    id:              generateId(),
    platform:        'zen',
    externalId:      `${row.Date}_${row.Description}_${row.Amount}`, // немає UUID у CSV
    accountId,
    type:            isFee ? 'fee' : (amount >= 0 ? 'income' : 'expense'),
    amount,
    currency:        row.Currency,
    feeAmount:       isFee ? Math.abs(amount) : 0,
    feeCurrency:     isFee ? row.Currency : undefined,
    feeType:         isFee ? 'service_fee' : undefined,
    description:     row.Description,
    category:        zenTypeToCategory(row.Type),
    transactionDate: new Date(row.Date),
    rawPayload:      row,
  };
}

function zenTypeToCategory(type: string): string | undefined {
  const map: Record<string, string> = {
    CARD_PAYMENT:       'card_payment',
    INCOMING_TRANSFER:  'transfer_in',
    OUTGOING_TRANSFER:  'transfer_out',
    FEE:                'fee',
    EXCHANGE:           'currency_exchange',
    REFUND:             'refund',
    ATM_WITHDRAWAL:     'cash',
  };
  return map[type];
}
```

---

## 4. Завантаження файлу у застосунку (Mobile)

```typescript
// mobile/src/services/csvImportService.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export async function importZenCSV(accountId: string) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', '*/*'],
  });

  if (result.canceled) return;

  const fileUri  = result.assets[0].uri;
  const content  = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Відправляємо на backend для парсингу
  await api.post('/integrations/zen/import', {
    csv_content: content,
    account_id: accountId,
  });
}
```

---

## 5. Дедуплікація

Оскільки Zen CSV не містить унікальних ID транзакцій, дедуплікація базується на хеші:

```typescript
import { createHash } from 'crypto';

function zenExternalId(row: ZenCSVRow): string {
  const key = `${row.Date}|${row.Description}|${row.Amount}|${row.Currency}`;
  return createHash('sha256').update(key).digest('hex').substring(0, 16);
}
```

> **Увага:** якщо є дві однакові транзакції в один день на однакову суму з однаковим описом — одна з них буде пропущена як дублікат. Це обмеження CSV-підходу.

---

## 6. Merchant Payments API (майбутнє — v2.0)

Для merchant-акаунтів Zen надає REST API з полем `feeAmount`:

```json
{
  "id": "pay_abc123",
  "amount": 10000,
  "currency": "EUR",
  "feeAmount": 290,
  "feeCurrency": "EUR",
  "status": "completed",
  "createdAt": "2026-04-01T12:00:00Z",
  "description": "Order #456"
}
```

Маппінг поля `feeAmount` → `fee_amount`, `fee_type = 'payment_processing_fee'`.

---

## Обмеження та примітки

| Обмеження | Деталі |
|---|---|
| Тільки ручний імпорт | Для особистого акаунту немає автосинхронізації |
| Формат CSV може змінитись | Рекомендується version-detection при парсингу |
| Немає push-нотифікацій | Дані оновлюються тільки після нового імпорту |
| Дедуплікація за хешем | Можливі пропуски при однакових транзакціях |
