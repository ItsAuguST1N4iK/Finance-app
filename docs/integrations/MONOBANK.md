# MONOBANK Integration

## Метод доступу

Monobank надає публічний API з самостійною реєстрацією токена через [bank.gov.ua](https://api.monobank.ua/).

| Параметр | Значення |
|---|---|
| Тип автентифікації | `X-Token` header |
| Де отримати | [https://api.monobank.ua](https://api.monobank.ua) → «Для розробників» |
| Де зберігати | `expo-secure-store` на пристрої (Keychain / Keystore) |

---

## Ендпоінти

### Інформація про клієнта та рахунки

```
GET https://api.monobank.ua/personal/client-info
Headers: X-Token: <token>
```

**Відповідь (accounts[]):**
```json
{
  "clientId": "abc123",
  "name": "Іван Іванов",
  "accounts": [
    {
      "id": "acc_black",
      "sendId": "...",
      "balance": 123456,      // у мінімальних одиницях (копійки)
      "creditLimit": 0,
      "type": "black",
      "currencyCode": 980,    // ISO 4217 numeric: 980=UAH, 840=USD, 978=EUR
      "cashbackType": "UAH",
      "maskedPan": ["5375****1234"],
      "iban": "UA..."
    }
  ]
}
```

### Виписка по рахунку

```
GET https://api.monobank.ua/personal/statement/{account}/{from}/{to}
Headers: X-Token: <token>

Параметри:
  account — ID рахунку або '0' для дефолтного
  from    — Unix timestamp (початок)
  to      — Unix timestamp (кінець, опційно)
```

> **Ліміт:** 1 запит / 60 секунд на рахунок. Максимальний діапазон — 31 день.

**Відповідь (transactions[]):**
```json
{
  "id": "ZuHWzqkKGVo=",
  "time": 1554466347,
  "description": "Кава Lavazza",
  "mcc": 5812,
  "originalMcc": 5812,
  "hold": false,
  "amount": -2500,            // у копійках, від'ємне = витрата
  "operationAmount": -2500,
  "currencyCode": 980,
  "commissionRate": 0,        // 0–1, комісія за операцію
  "cashbackAmount": 25,
  "balance": 100000,
  "comment": "",
  "receiptId": "",
  "invoiceId": "",
  "counterEdrpou": "",
  "counterIban": "",
  "counterName": ""
}
```

---

## Примітка щодо Webhook

Monobank підтримує Webhook для отримання транзакцій у реальному часі, але Webhook потребує публічного сервера для прийому POST-запитів. Оскільки застосунок **не має власного сервера**, замість Webhook використовується **поллінг**.

> Якщо у майбутньому з'явиться потреба у real-time — можна скористатися безкоштовними serverless functions (Cloudflare Workers / Vercel Edge) виключно як тонким проксі для Webhook без БД.

---

## Маппінг до UnifiedTransaction

```typescript
function mapMonobankTx(
  tx: MonobankStatement,
  accountId: string
): UnifiedTransaction {
  const absAmount = Math.abs(tx.amount / 100);
  const type      = tx.amount >= 0 ? 'income' : 'expense';

  return {
    id:              generateId(),
    platform:        'monobank',
    externalId:      tx.id,
    accountId,
    type,
    amount:          tx.amount / 100,   // конвертуємо з копійок
    currency:        numericToISO(tx.currencyCode),
    feeAmount:       absAmount * tx.commissionRate,
    feeCurrency:     numericToISO(tx.currencyCode),
    feeType:         tx.commissionRate > 0 ? 'commission' : undefined,
    description:     tx.description,
    mcc:             tx.mcc,
    transactionDate: new Date(tx.time * 1000),
    rawPayload:      tx,
  };
}
```

---

## Стратегія синхронізації

| Сценарій | Метод |
|---|---|
| Перша синхронізація | Запитати виписку за 31 день (максимум за раз) |
| Поточна синхронізація | Поллінг 1×/год через `expo-background-fetch` + вручну pull-to-refresh |
| Відновлення після відключення | Запитати виписку з `last_synced_at` до `now` |

```typescript
// Перша синхронізація (кілька запитів по 31 день)
async function initialSync(token: string, accountId: string, months: number) {
  const now = Date.now() / 1000;
  for (let i = 0; i < months; i++) {
    const to   = now - i * 31 * 86400;
    const from = to  - 31 * 86400;
    const statements = await getStatement(token, accountId, from, to);
    await saveTransactions(statements.map(mapMonobankTx));
    await sleep(65_000); // ліміт: 1 req/60 сек
  }
}
```

---

## Коди валют (ISO 4217 numeric)

| Код | Валюта |
|---|---|
| 980 | UAH |
| 840 | USD |
| 978 | EUR |
| 826 | GBP |
| 985 | PLN |
