# IBKR Integration — Flex Web Service (Finance Control v10.2.5)

## Метод доступу

Interactive Brokers надає **Flex Web Service** — механізм отримання звітів через HTTP без необхідності постійно відкритого TWS/IB Gateway.

| Параметр | Значення |
|---|---|
| Тип автентифікації | `FlexToken` (отримується у Client Portal) |
| Де налаштувати | Client Portal → Reports → Flex Queries |
| Ліміти | 10 запитів / хвилину, дані оновлюються 1 раз/день (після закриття ринку) |

---

## Налаштування Flex Query у IBKR Client Portal

1. Зайдіть у **Client Portal → Performance & Reports → Flex Queries**
2. Натисніть **Create** → **Activity Flex Query**
3. Виберіть розділи звіту:
   - ✅ **Trades** (угоди)
   - ✅ **Cash Transactions** (дивіденди, виведення коштів)
   - ✅ **Open Positions** (відкриті позиції, для балансу)
4. Формат: **XML**
5. Збережіть → отримайте `Query ID`
6. Перейдіть до **Manage Flex Tokens** → створіть токен → отримайте `Flex Token`

> Зберігайте `FlexToken` та `queryId` у backend `.env` або Supabase Vault.

---

## API ендпоінти

### Крок 1: Надіслати запит на генерацію звіту

```
GET https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest
  ?t={FlexToken}
  &q={queryId}
  &v=3
```

**Відповідь:**
```xml
<FlexStatementResponse timestamp="20260401;120000">
  <Status>Success</Status>
  <ReferenceCode>1234567890</ReferenceCode>
  <Url>https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement</Url>
</FlexStatementResponse>
```

### Крок 2: Завантажити згенерований звіт

```
GET {Url від кроку 1}
  ?t={FlexToken}
  &q={ReferenceCode}
  &v=3
```

> Між кроком 1 і 2 — затримка 1–10 секунд (звіт генерується асинхронно). Реалізуйте retry з `sleep(2000)`.

---

## Структура XML-відповіді

### Trade (угода)

```xml
<Trade
  accountId       = "U1234567"
  currency        = "USD"
  symbol          = "AAPL"
  description     = "APPLE INC"
  dateTime        = "2026-04-01;10:30:00"
  quantity        = "10"
  tradePrice      = "175.50"
  tradeMoney      = "1755.00"
  proceeds        = "1755.00"
  commission      = "-1.75"      <!-- брокерська комісія -->
  taxes           = "0"
  brokerFees      = "0"
  thirdPartyFees  = "0"
  otherFees       = "0"
  netCash         = "1753.25"    <!-- proceeds + всі комісії -->
  buySell         = "BUY"        <!-- BUY | SELL -->
  transactionID   = "987654321"
/>
```

### CashTransaction (дивіденди, податки, переказ)

```xml
<CashTransaction
  accountId       = "U1234567"
  currency        = "USD"
  description     = "AAPL (US0378331005) CASH DIVIDEND USD 0.25 PER SHARE"
  amount          = "25.00"
  type            = "Dividends"   <!-- Dividends | Withholding Tax | Deposits/Withdrawals -->
  tradeDate       = "2026-04-01"
  transactionID   = "111222333"
/>
```

---

## Парсинг XML та маппінг

```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

function parseFlexReport(xml: string): UnifiedTransaction[] {
  const parsed = parser.parse(xml);
  const trades  = [parsed.FlexQueryResponse.FlexStatements.FlexStatement.Trades.Trade].flat();
  const cashTxs = [parsed.FlexQueryResponse.FlexStatements.FlexStatement.CashTransactions.CashTransaction].flat();

  return [
    ...trades.map(mapIBKRTrade),
    ...cashTxs.map(mapIBKRCashTransaction),
  ];
}

function mapIBKRTrade(trade: IBKRTrade): UnifiedTransaction {
  const isBuy   = trade.buySell === 'BUY';
  const fee     = calculateIBKRFee(trade); // з FEE_CALCULATION.md

  return {
    id:              generateId(),
    platform:        'ibkr',
    externalId:      trade.transactionID,
    accountId:       trade.accountId,
    type:            isBuy ? 'expense' : 'income',
    amount:          parseFloat(trade.proceeds),
    currency:        trade.currency,
    feeAmount:       fee.fee_amount,
    feeCurrency:     fee.fee_currency,
    feeType:         fee.fee_type,
    description:     `${trade.buySell} ${trade.quantity} ${trade.symbol} @ ${trade.tradePrice}`,
    transactionDate: parseIBKRDate(trade.dateTime),
    rawPayload:      trade,
  };
}

function mapIBKRCashTransaction(tx: IBKRCashTx): UnifiedTransaction {
  const isDividend = tx.type === 'Dividends';
  const isWHTax    = tx.type === 'Withholding Tax';

  return {
    id:              generateId(),
    platform:        'ibkr',
    externalId:      tx.transactionID,
    accountId:       tx.accountId,
    type:            isWHTax ? 'fee' : (parseFloat(tx.amount) >= 0 ? 'income' : 'expense'),
    amount:          parseFloat(tx.amount),
    currency:        tx.currency,
    feeAmount:       isWHTax ? Math.abs(parseFloat(tx.amount)) : 0,
    feeCurrency:     tx.currency,
    feeType:         isWHTax ? 'withholding_tax' : undefined,
    description:     tx.description,
    category:        isDividend ? 'dividend' : undefined,
    transactionDate: new Date(tx.tradeDate),
    rawPayload:      tx,
  };
}
```

---

## Стратегія синхронізації

| Сценарій | Метод |
|---|---|
| Щоденна синхронізація | Cron о 08:00 UTC (після оновлення даних IBKR) |
| Діапазон запиту | Завжди запитувати останні 7 днів (перекриття для надійності) |
| Дедуплікація | `UNIQUE(platform, external_id)` у БД |

```typescript
// backend/src/jobs/syncJob.ts
cron.schedule('0 8 * * *', async () => {
  const from = dayjs().subtract(7, 'day').format('YYYYMMDD');
  const to   = dayjs().format('YYYYMMDD');
  await syncIBKR(from, to);
});
```

---

## Типові помилки та їх обробка

| Помилка | Причина | Рішення |
|---|---|---|
| `Status: Warn — Please try again` | Звіт ще генерується | Retry через 3 сек, макс 5 спроб |
| `Status: Fail — Invalid token` | Невірний або прострочений FlexToken | Попросити користувача оновити токен |
| HTTP 429 | Перевищено ліміт 10 req/хв | Exponential backoff |
| Порожній XML | Немає транзакцій за період | Зберегти відмітку часу, не кидати помилку |
