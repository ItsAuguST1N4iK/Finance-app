# Finance Control — Mobile App

Особистий фінансовий менеджер для відстеження рахунків у **Monobank**, **IBKR**, **PrivatBank** та **Zen.com** з уніфікованою аналітикою, плануванням майбутніх надходжень і детальним обліком комісій.

Усе працює **повністю на пристрої** — без власного сервера та хмарної бази даних. Дані зберігаються у SQLite, токени — у захищеному сховищі ОС (Keychain / Keystore).

---

## Можливості

| Функція | Статус |
|---|---|
| Синхронізація Monobank (прямий API) | MVP |
| Синхронізація IBKR Flex Web Service (прямий API) | MVP |
| PrivatBank через Salt Edge AISP (прямий API) | MVP |
| Zen.com CSV-імпорт (локальний парсинг) | MVP |
| **Планер майбутніх надходжень** | MVP |
| **Аналітика по платформах / місяць / рік** | MVP |
| Розрахунок і відображення комісій | MVP |
| Офлайн-доступ до всіх даних | MVP |
| ФОП-режим (PrivatBank AutoClient) | Майбутнє |
| Zen Payments API | Майбутнє |

---

## Швидкий старт для розробника

```bash
# Клонуємо репозиторій
git clone https://github.com/your-org/finance-app.git
cd finance-app

# Встановлюємо залежності
npm install

# Запускаємо Expo
npx expo start
```

Сервер не потрібен. Токени вводяться в застосунку через екран Налаштувань і зберігаються у захищеному сховищі пристрою.

---

## Документація

| Документ | Призначення |
|---|---|
| [PRD](docs/PRD.md) | Вимоги до продукту, user stories, екрани |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Локальна архітектура без сервера, tech stack, діаграми |
| [DATA_MODEL](docs/DATA_MODEL.md) | SQLite схема: транзакції, планові надходження, аналітика |
| [FEE_CALCULATION](docs/FEE_CALCULATION.md) | Правила обчислення комісій по платформах |
| [MONOBANK](docs/integrations/MONOBANK.md) | Інтеграція Monobank API (прямі запити) |
| [IBKR](docs/integrations/IBKR.md) | Інтеграція IBKR Flex Web Service |
| [PRIVATBANK](docs/integrations/PRIVATBANK.md) | Інтеграція PrivatBank / Salt Edge |
| [ZEN](docs/integrations/ZEN.md) | Інтеграція Zen.com CSV |

---

## Стек технологій

- **Mobile:** React Native + Expo (iOS & Android)
- **База даних:** SQLite на пристрої (`expo-sqlite`)
- **Токени:** `expo-secure-store` (Keychain / Keystore)
- **Фонова синхронізація:** `expo-background-fetch` + `expo-task-manager`
- **Нотифікації:** `expo-notifications` (локальні, без сервера)
- **State:** Zustand
- **Авторизація:** `expo-local-authentication` (Face ID / Fingerprint / PIN)
