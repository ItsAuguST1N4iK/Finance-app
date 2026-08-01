# FEE CALCULATION — Finance Control v10.2.5

## Принципи

1. Комісії завжди зберігаються окремо у полях `fee_amount` / `fee_currency` / `fee_type`.
2. Комісія не зменшує `amount` транзакції — це дає змогу правильно рахувати як повну суму операції, так і чисту суму після комісії.
3. В аналітиці комісії виділяються в окрему метрику і не змішуються з витратами.

---

## Правила по платформах

### Monobank

| Поле API | Відображення в додатку |
|---|---|
| `commissionRate` | Відсоток комісії (0–1, напр. `0.015` = 1.5%) |
| `amount` | Сума транзакції (у мінімальних одиницях, ÷100) |

**Розрахунок:**
```typescript
fee_amount   = Math.abs(tx.amount / 100) * tx.commissionRate;
fee_currency = currencyCodeToISO(tx.currencyCode); // 980 → 'UAH'
fee_type     = 'exchange_fee'; // або 'commission' залежно від типу операції
```

> Якщо `commissionRate === 0` → `fee_amount = 0`, поле не відображається у UI.

---

### IBKR (Interactive Brokers)

IBKR надає окремі поля для кожного типу витрат у XML Flex Report:

| XML-поле | `fee_type` | Опис |
|---|---|---|
| `commission` | `broker_commission` | Основна брокерська комісія |
| `taxes` | `tax` | Податки (withholding tax тощо) |
| `brokerFees` | `broker_fee` | Додаткові збори брокера |
| `thirdPartyFees` | `third_party_fee` | Збори третіх сторін |
| `otherFees` | `other_fee` | Інші збори |
| `accrualCode` | — | Тип нарахування (для довідки) |

**Розрахунок:**
```typescript
const feeFields = ['commission','taxes','brokerFees','thirdPartyFees','otherFees'];

const fee_amount = feeFields.reduce((sum, field) => {
  return sum + Math.abs(parseFloat(trade[field] ?? '0'));
}, 0);

// Якщо кілька компонентів — зберігаємо деталізацію у raw_payload,
// у fee_type вказуємо 'composite'
fee_type     = feeFields.filter(f => parseFloat(trade[f]) !== 0).join('+');
fee_currency = trade.currency; // 'USD', 'EUR' тощо
```

> Для Cash Transactions типу `WHTAX` (withholding tax) — `fee_type = 'withholding_tax'`.

---

### PrivatBank (через Salt Edge)

Salt Edge API не повертає поле комісії окремо для фізичних осіб.

**Стратегія:**

| Сценарій | Що робимо |
|---|---|
| Валютний обмін (мультивалютна транзакція) | Обчислюємо різницю між `amount` за ринковим курсом (NBU) і фактичним курсом банку |
| Картковий платіж | `fee_amount = 0` (не доступно) |
| Переказ між рахунками | `fee_amount = 0` або вручну додає користувач |

```typescript
// Для валютної транзакції:
const marketAmount = amount_foreign * nbuRate;
const actualAmount = amount_uah;
fee_amount = Math.abs(actualAmount - marketAmount);
fee_type   = 'exchange_spread';
```

---

### Zen.com

**Особистий акаунт (CSV):**
- CSV-виписка не містить окремої колонки комісій.
- `fee_amount = 0` за замовчуванням.
- Користувач може вручну додати комісію через UI.

**Merchant (майбутнє — Payments API):**
```typescript
fee_amount   = parseFloat(tx.feeAmount ?? '0');
fee_currency = tx.feeCurrency ?? tx.currency;
fee_type     = 'payment_processing_fee';
```

---

## Відображення в аналітиці

### Метрики з урахуванням комісій

```
Чистий дохід    = Σ income.amount − Σ income.fee_amount
Чиста витрата   = Σ |expense.amount| + Σ expense.fee_amount
Загальні комісії = Σ fee_amount (всі типи)
Чистий результат = Чистий дохід − Чиста витрата
```

### Розбивка комісій в аналітиці (по платформах)

| Платформа | Типові fee_type |
|---|---|
| Monobank | `exchange_fee`, `commission` |
| IBKR | `broker_commission`, `tax`, `third_party_fee` |
| PrivatBank | `exchange_spread` |
| Zen | `payment_processing_fee` |

---

## Приклад: розрахунок комісії IBKR у коді

```typescript
// src/services/feeCalculator.ts

export function calculateIBKRFee(trade: IBKRTradeRecord): FeeResult {
  const components = {
    broker_commission: Math.abs(parseFloat(trade.commission ?? '0')),
    tax:               Math.abs(parseFloat(trade.taxes ?? '0')),
    broker_fee:        Math.abs(parseFloat(trade.brokerFees ?? '0')),
    third_party_fee:   Math.abs(parseFloat(trade.thirdPartyFees ?? '0')),
    other_fee:         Math.abs(parseFloat(trade.otherFees ?? '0')),
  };

  const total = Object.values(components).reduce((a, b) => a + b, 0);
  const activeTypes = Object.entries(components)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);

  return {
    fee_amount:   total,
    fee_currency: trade.currency,
    fee_type:     activeTypes.length === 1 ? activeTypes[0] : 'composite',
    fee_breakdown: components, // зберігається у raw_payload
  };
}
```
