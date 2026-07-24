export type Language = 'uk' | 'en';

export const LANGUAGES: Language[] = ['uk', 'en'];

export const LANGUAGE_LABELS: Record<Language, string> = {
  uk: 'Українська',
  en: 'English',
};

export interface Translations {
  tabDashboard: string;
  tabTransactions: string;
  tabPlanner: string;
  tabAnalytics: string;
  tabSettings: string;

  dashTotalBalance: string;
  dashAccounts: string;
  dashAddAccounts: string;
  dashUpcoming: string;
  dashRecentTx: string;
  dashNoTx: string;
  dashExchangeRates: string;
  dashBuy: string;
  dashSell: string;
  dashRefresh: string;
  dashEditCard: string;
  dashCardName: string;
  dashCardColor: string;
  dashBaseCurrency: string;

  txSearch: string;
  txNoResults: string;
  txFilters: string;
  txPlatforms: string;
  txFilterAccounts: string;
  txFilterAll: string;
  txTypes: string;
  txCurrency: string;
  txReset: string;
  txApply: string;
  txDateFrom: string;
  txDateTo: string;
  txCount: string;
  txFee: string;
  txTransaction: string;
  txExpandFilters: string;
  txCollapseFilters: string;

  analyticsThisMonth: string;
  analyticsLastMonth: string;
  analyticsThisYear: string;
  analyticsLastYear: string;
  analyticsAll: string;
  analyticsCustom: string;
  analyticsClearFilter: string;
  analyticsIncome: string;
  analyticsExpenses: string;
  analyticsFees: string;
  analyticsResult: string;
  analyticsIncomeByPeriod: string;
  analyticsExpenseByPeriod: string;
  analyticsIncomesBySource: string;
  analyticsExpensesByPlatform: string;
  analyticsStatsByPlatform: string;
  analyticsIncomeAndExpense: string;
  analyticsTopCategories: string;
  analyticsNoData: string;
  analyticsDaily: string;
  analyticsMonthly: string;
  analyticsShowIncome: string;
  analyticsShowExpense: string;
  analyticsTx: string;

  settingsAppearance: string;
  settingsUserPreferences: string;
  settingsApiKeys: string;
  settingsCards: string;
  settingsTheme: string;
  settingsAccentColor: string;
  settingsLanguage: string;
  settingsHomeCurrency: string;
  settingsHomeCurrencyHint: string;
  settingsCurrencies: string;
  settingsCurrenciesHint: string;
  settingsPlatforms: string;
  settingsPlatformsHint: string;
  settingsAccounts: string;
  settingsNoAccounts: string;
  settingsAbout: string;
  settingsAboutLocal: string;
  settingsSyncMono: string;
  settingsSyncing: string;
  settingsApiRateLimit: string;
  settingsMonobankInstructions: string;
  settingsIbkrTokenInstructions: string;
  settingsIbkrQueryInstructions: string;
  settingsSaltEdgeInstructions: string;
  settingsHowToGet: string;

  themeDark: string;
  themeCursor: string;
  themeOled: string;
  themeLight: string;

  platformMonobank: string;
  platformIbkr: string;
  platformPrivatbank: string;
  platformZen: string;
  platformManual: string;

  typeIncome: string;
  typeExpense: string;
  typeTransfer: string;
  typeFee: string;

  save: string;
  cancel: string;
  delete: string;
  reset: string;
  apply: string;
  connected: string;
  disconnect: string;
  saved: string;
  error: string;
  confirm: string;
  edit: string;
  deleteAccount: string;
  deleteAccountConfirm: string;
  txWillRemain: string;
  deleteToken: string;
  deleteTokenConfirm: string;
  tokenSaved: string;
  tokenSavedHint: string;
  pasteToken: string;

  months: string[];
  monthsShort: string[];
  weekdays: string[];

  overdue: string;
  today: string;
  inDays: string;
  commissionShort: string;
  plannerDeleteConfirm: string;
  plannerDeleteHint: string;
  plannerIncome: string;
  plannerExpense: string;
  plannerAddIncome: string;
  plannerAddExpense: string;
  plannerPaid: string;
  plannerEditTitle: string;
  plannerAccount: string;

  tagLabel: string;
  tagNoTag: string;
  tagEdit: string;
  tagSearch: string;
  tagEntertainment: string;
  tagUtilities: string;
  tagElectronics: string;
  tagSelfTransfer: string;
  tagTransfer: string;
  tagTopUp: string;

  txDetail: string;
  txAccount: string;
  txDescription: string;
  txCategory: string;
  txPlatform: string;
  txExactDate: string;
  txMcc: string;

  settingsReAutoTag: string;
  settingsReAutoTagHint: string;
  settingsCardsAndTags: string;
  settingsRetagging: string;
  settingsRetagSuccess: string;
  settingsDataDeleted: string;
  settingsResetDone: string;
  settingsTokenMissing: string;
  settingsTokenMissingHint: string;
  settingsMonoConnecting: string;
  settingsMonoRateLimit: string;
  settingsMonoPause: string;
  settingsMonoSyncDone: string;
  settingsMonoSyncNoNew: string;
  settingsSyncError: string;
  settingsMonoApiSync: string;
  settingsCsvImportLabel: string;
  settingsMonoCsvInstructions: string;
  settingsMonobankLimit: string;
  settingsMonobankLimitHint: string;
  settingsZen: string;
  settingsZenHint: string;
  settingsZenInstructions: string;
  settingsPrivatbank: string;
  settingsPrivatbankHint: string;
  settingsPrivatbankInstructions: string;

  // CSV import
  importCsvBtn: string;
  importCsvLoading: string;
  importCsvSuccess: string;
  importCsvSkipped: string;
  importCsvError: string;
  importCsvCancel: string;
  importCsvSectionTitle: string;
  importCsvSelectAccount: string;
  importCsvNoAccounts: string;
  importCsvNoTx: string;
  importCsvImportedTitle: string;
  importDuplicatesTitle: string;
  importDuplicatesMessage: string;
  importAddAnyway: string;
  importRejectDuplicates: string;
  importCurrencyLabel: string;
  importCurrencyAccount: string;
  importCurrencyOperation: string;

  done: string;
  yes: string;
  no: string;
  datePickerDefaultTitle: string;

  plannerSourceFrom: string;
  plannerSourceTo: string;
  plannerReceived: string;
  plannerFreqOnce: string;
  plannerFreqWeekly: string;
  plannerFreqMonthly: string;
  plannerFreqCustom: string;
  plannerFillRequired: string;
  plannerAccountError: string;
  plannerNamePlaceholder: string;
  plannerSourceLabelExpense: string;
  plannerSourceLabelIncome: string;
  plannerSourcePlaceholderExpense: string;
  plannerSourcePlaceholderIncome: string;
  plannerCommentPlaceholder: string;
  plannerConfirmTitle: string;
  plannerMarkPaidConfirm: string;
  plannerMarkReceivedConfirm: string;
  plannerCancelTitle: string;
  plannerCancelConfirm: string;
  plannerStatusPending: string;
  plannerStatusPaid: string;
  plannerStatusReceived: string;
  plannerStatusConfirmed: string;
  plannerStatusOverdue: string;
  plannerStatusCancelled: string;
  plannerOverdueShort: string;

  // Reset
  settingsResetData: string;
  settingsResetDataHint: string;
  settingsResetDataConfirm: string;
  settingsResetSettings: string;
  settingsResetSettingsHint: string;
  settingsResetSettingsConfirm: string;
  settingsDanger: string;

  settingsAnimSpeed: string;
  settingsAnimSpeedHint: string;
  settingsTransparency: string;
  settingsTransparencyHint: string;
  settingsTransparencyPreview: string;
  settingsTransparencyPreviewHint: string;

  analyticsExcludeSelfTransfers: string;
  analyticsIncludeSelfTransfers: string;

  dateConfirmYear: string;
  dateConfirmMonth: string;
  dateConfirmDay: string;

  settingsAddAccount: string;
  settingsAddAccountName: string;
  settingsPlatform: string;
  settingsCategoryRules: string;
  settingsCategoryRulesHint: string;
  settingsAddRule: string;
  settingsEditRule: string;
  settingsRuleName: string;
  settingsRuleNameOptional: string;
  settingsRuleOptionalHint: string;
  settingsRuleField: string;
  settingsRuleOp: string;
  settingsRuleValue: string;
  settingsRuleCategory: string;
  settingsRulePriority: string;
  ruleFieldMcc: string;
  ruleFieldDescription: string;
  ruleFieldAmount: string;
  ruleFieldPlatform: string;
  ruleFieldType: string;
  ruleFieldCurrency: string;
  ruleOpContains: string;
  ruleOpEquals: string;
  ruleOpRegex: string;
  ruleOpRange: string;

  catFood: string;
  catTransport: string;
  catHealth: string;
  catClothing: string;
  catSubscriptions: string;
  catIncome: string;
  catOther: string;
}

const uk: Translations = {
  tabDashboard: 'Головна',
  tabTransactions: 'Транзакції',
  tabPlanner: 'Планер',
  tabAnalytics: 'Аналітика',
  tabSettings: 'Налаштування',

  dashTotalBalance: 'Загальний баланс',
  dashAccounts: 'Рахунки',
  dashAddAccounts: 'Додайте рахунки у Налаштуваннях',
  dashUpcoming: 'Очікувані надходження',
  dashRecentTx: 'Останні транзакції',
  dashNoTx: 'Транзакцій поки немає.\nПідключіть рахунки у Налаштуваннях.',
  dashExchangeRates: 'Курс валют',
  dashBuy: 'Купівля',
  dashSell: 'Продаж',
  dashRefresh: 'Оновити',
  dashEditCard: 'Редагувати картку',
  dashCardName: 'Назва картки',
  dashCardColor: 'Колір картки',
  dashBaseCurrency: 'Обмін валюти:',

  txSearch: 'Пошук за описом...',
  txNoResults: 'Транзакцій не знайдено',
  txFilters: 'Фільтри',
  txPlatforms: 'Платформи',
  txFilterAccounts: 'Рахунки',
  txFilterAll: 'Всі',
  txTypes: 'Тип транзакції',
  txCurrency: 'Валюта',
  txReset: 'Скинути',
  txApply: 'Застосувати',
  txDateFrom: 'Від',
  txDateTo: 'До',
  txCount: 'транзакцій',
  txFee: 'комісія',
  txTransaction: 'Транзакція',
  txExpandFilters: 'Розгорнути',
  txCollapseFilters: 'Згорнути',

  analyticsThisMonth: 'Цей місяць',
  analyticsLastMonth: 'Мин. місяць',
  analyticsThisYear: 'Цей рік',
  analyticsLastYear: 'Мин. рік',
  analyticsAll: 'Весь час',
  analyticsCustom: 'Власний',
  analyticsClearFilter: 'Скинути',
  analyticsIncome: 'Доходи',
  analyticsExpenses: 'Витрати',
  analyticsFees: 'Комісії',
  analyticsResult: 'Результат',
  analyticsIncomeByPeriod: 'Доходи',
  analyticsExpenseByPeriod: 'Витрати',
  analyticsIncomesBySource: 'Джерела доходів',
  analyticsExpensesByPlatform: 'Витрати по платформах',
  analyticsStatsByPlatform: 'Статистика по платформах',
  analyticsIncomeAndExpense: 'Доходи та витрати',
  analyticsTopCategories: 'Топ категорій витрат',
  analyticsNoData: 'Немає даних для вибраного періоду',
  analyticsDaily: 'По днях',
  analyticsMonthly: 'По місяцях',
  analyticsShowIncome: 'Доходи',
  analyticsShowExpense: 'Витрати',
  analyticsTx: 'транзакцій',

  settingsAppearance: 'Вигляд додатку',
  settingsUserPreferences: 'Перевага користувача',
  settingsApiKeys: 'Ключі API',
  settingsCards: 'Налаштування карток',
  settingsTheme: 'Тема оформлення',
  settingsAccentColor: 'Акцентний колір',
  settingsLanguage: 'Мова',
  settingsHomeCurrency: 'Головна валюта',
  settingsHomeCurrencyHint: 'Валюта для відображення загального балансу на головному екрані',
  settingsCurrencies: 'Відображувані валюти',
  settingsCurrenciesHint: 'Оберіть валюти для відображення курсу на головному екрані',
  settingsPlatforms: 'Підключення платформ',
  settingsPlatformsHint: 'Токени зберігаються у захищеному сховищі пристрою (Keychain / Keystore).',
  settingsAccounts: 'Рахунки',
  settingsNoAccounts: 'Після підключення платформи та синхронізації тут зʼявляться ваші рахунки.',
  settingsAbout: 'Finance Control v1.0',
  settingsAboutLocal: 'Весь облік ведеться локально на пристрої.\nХмарних серверів немає.',
  settingsSyncMono: 'Синхронізувати Monobank',
  settingsSyncing: 'Синхронізація…',
  settingsApiRateLimit: 'Запит {current} з {total} · Ліміт API: ~62 с між запитами',
  settingsMonobankInstructions: '1. Відкрий додаток Monobank на телефоні\n2. Натисни на іконку ⚙️ (шестерня) у правому верхньому куті\n3. Прокрути вниз і знайди розділ "Для розробників"\n   — або відкрий сайт: https://api.monobank.ua у браузері\n4. Натисни кнопку "Підтвердити доступ" та підтверди у додатку\n5. Скопіюй токен та вставте у поле нижче\n\n📋 Приклад того, як виглядає токен:\nuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n(буква «u» на початку, потім 44 символи — латинські літери та цифри)\n\n⚠️ Токен діє 30 днів без використання. Якщо не синхронізувати — потрібно отримати новий.',
  settingsIbkrTokenInstructions: '── ЯК ОТРИМАТИ FLEX TOKEN ──\n\n1. Відкрий браузер та зайди: https://portal.interactivebrokers.com\n2. Увійди у свій IBKR акаунт (Client Portal)\n3. У меню зліва або вгорі натисни: Performance & Reports\n4. Обери: Flex Queries\n5. На сторінці Flex Queries знайди посилання "Manage Flex Tokens" (праворуч вгорі або у вкладці)\n6. Натисни "+ Create Token"\n7. Скопіюй створений токен та вставте нижче\n\n📋 Як виглядає Flex Token:\nAbCdEfGhIj1234567890AbCdEfGhIj12345678\n(38 символів: латинські літери та цифри, без пробілів)\n\n⚠️ Токен відображається лише один раз! Зберігай одразу.',
  settingsIbkrQueryInstructions: '── ЯК СТВОРИТИ FLEX QUERY ──\n\nFlex Query — це звіт, який IBKR генерує за твоїм запитом.\n\n1. Зайди у Client Portal: https://portal.interactivebrokers.com\n2. Перейди: Performance & Reports → Flex Queries\n3. Натисни "+ Create" → обери тип "Activity Flex Query"\n4. Введи назву (наприклад "Finance Export")\n5. У секції "Sections" постав галочки:\n   ✅ Cash Transactions\n   ✅ Trades (якщо потрібна торгова активність)\n6. Delivery Configuration:\n   • Format: XML\n   • Period: Last Business Day (або "Custom Date Range")\n7. General Configuration:\n   • Date Format: yyyyMMdd\n   • Time Format: HHmmss\n8. Натисни "Continue" → "Create"\n9. Після збереження ти побачиш числовий ID поряд із назвою Query\n10. Скопіюй цей ID та вставте нижче\n\n📋 Як виглядає Query ID:\n1234567\n(6–8 цифр, лише числа)',
  settingsSaltEdgeInstructions: '1. Відкрий https://www.saltedge.com у браузері\n2. Зареєструйся або увійди у свій акаунт\n3. Перейди: My Applications → натисни "+ Create Application"\n4. Заповни форму та збережи додаток\n5. Скопіюй "App ID" (не Secret!) та вставте у поле нижче\n\n📋 Приклад того, як виглядає Salt Edge App ID:\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n(довгий рядок з латинських літер та цифр)',
  settingsHowToGet: 'Як отримати?',

  themeDark: 'Dark Blue',
  themeCursor: 'Dark Grey',
  themeOled: 'OLED Black',
  themeLight: 'Світла',

  platformMonobank: 'Monobank',
  platformIbkr: 'Interactive Brokers',
  platformPrivatbank: 'PrivatBank',
  platformZen: 'Zen',
  platformManual: 'Вручну',

  typeIncome: 'Дохід',
  typeExpense: 'Витрата',
  typeTransfer: 'Переказ',
  typeFee: 'Комісія',

  save: 'Зберегти',
  cancel: 'Скасувати',
  delete: 'Видалити',
  reset: 'Скинути',
  apply: 'Застосувати',
  connected: 'Підключено',
  disconnect: 'Відключити',
  saved: 'Збережено',
  error: 'Помилка',
  confirm: 'Підтвердити',
  edit: 'Редагувати',
  deleteAccount: 'Видалити рахунок?',
  deleteAccountConfirm: 'Транзакції залишаться в базі',
  txWillRemain: 'Транзакції залишаться в базі',
  deleteToken: 'Видалити токен?',
  deleteTokenConfirm: 'буде видалено',
  tokenSaved: 'Збережено',
  tokenSavedHint: 'збережено у захищеному сховищі',
  pasteToken: 'Вставте токен...',

  months: ['Січень','Лютий','Березень','Квітень','Травень','Червень',
           'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'],
  monthsShort: ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'],
  weekdays: ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'],

  overdue: 'Прострочено',
  today: 'Сьогодні',
  inDays: 'через {n} дн.',
  commissionShort: 'комісія',
  plannerDeleteConfirm: 'Видалити запис?',
  plannerDeleteHint: 'Цю дію неможливо скасувати',
  plannerIncome: 'Надходження',
  plannerExpense: 'Витрата',
  plannerAddIncome: 'Додати надходження',
  plannerAddExpense: 'Додати витрату',
  plannerPaid: 'Оплачено',
  plannerEditTitle: 'Редагувати запис',
  plannerAccount: 'Рахунок',

  tagLabel: 'Тег',
  tagNoTag: 'Без тегу',
  tagEdit: 'Змінити тег',
  tagSearch: 'Категорія',
  tagEntertainment: 'Розваги',
  tagUtilities: 'Побут',
  tagElectronics: 'Електротехніка',
  tagSelfTransfer: 'Перекази між своїми рахунками',
  tagTransfer: 'Перекази',
  tagTopUp: 'Поповнення',

  txDetail: 'Деталі транзакції',
  txAccount: 'Рахунок',
  txDescription: 'Опис',
  txCategory: 'Категорія',
  txPlatform: 'Платформа',
  txExactDate: 'Дата та час',
  txMcc: 'MCC код',

  settingsReAutoTag: 'Автовизначення тегів',
  settingsReAutoTagHint: 'Встановлює теги для транзакцій без тегу на основі MCC та опису',
  settingsCardsAndTags: 'Картки та теги',
  settingsRetagging: 'Визначаємо теги…',
  settingsRetagSuccess: 'Оновлено теги та категорії для {count} транзакцій.',
  settingsDataDeleted: 'Всі транзакції видалено.',
  settingsResetDone: 'Налаштування скинуто до заводських.',
  settingsTokenMissing: 'Токен відсутній',
  settingsTokenMissingHint: 'Спочатку збережіть Monobank X-Token.',
  settingsMonoConnecting: 'Підключення до Monobank…',
  settingsMonoRateLimit: 'Ліміт API — чекаємо 65 с…',
  settingsMonoPause: 'Пауза між запитами…',
  settingsMonoSyncDone: 'Синхронізацію завершено!',
  settingsMonoSyncNoNew: 'Нових транзакцій не знайдено.',
  settingsSyncError: 'Помилка синхронізації',
  settingsMonoApiSync: 'API — автосинхронізація (90 днів)',
  settingsCsvImportLabel: 'CSV — імпорт виписки',
  settingsMonoCsvInstructions: '1. Відкрий додаток Monobank\n2. На головному екрані натисни "···" (три крапки)\n3. Перейди: Виписка → Завантажити (.csv)\n4. Відправ файл на цей пристрій\n5. Обери картку нижче та натисни "Імпортувати файл"\n\n✅ CSV містить всю доступну історію без обмежень!',
  settingsMonobankLimit: 'Обмеження API Monobank',
  settingsMonobankLimitHint: 'Monobank дозволяє завантажити лише 90 днів виписки. Більш старі дані недоступні через API. Точка відліку — дата першого підключення.',
  settingsZen: 'ZEN Money (CSV)',
  settingsZenHint: 'Інтеграція через файл виписки (CSV/OFX з додатку ZEN)',
  settingsZenInstructions: '1. Відкрийте додаток ZEN Money\n2. Перейдіть до: Профіль → Виписки / Експорт\n3. Оберіть формат CSV та завантажте файл\n4. Натисніть кнопку "Імпортувати CSV" нижче та оберіть файл\n\n⚠️ ZEN Money не має відкритого API для особистих рахунків. Використовується імпорт CSV-файлу.',
  settingsPrivatbank: 'PrivatBank (CSV)',
  settingsPrivatbankHint: 'Інтеграція через виписку з ПриватБанку',
  settingsPrivatbankInstructions: '1. Зайдіть у Приват24 (app або web.privatbank.ua)\n2. Виписка → Завантажити виписку → Формат CSV або XLS\n3. Натисніть "Імпортувати" нижче та оберіть файл\n\n⚠️ API ПриватБанку для фізичних осіб потребує корпоративного підключення. Тому використовується ручний імпорт файлу.',

  importCsvBtn: 'Імпортувати файл',
  importCsvLoading: 'Читаємо файл…',
  importCsvSuccess: 'Додано {count} транзакцій',
  importCsvSkipped: 'Пропущено {count} дублікатів',
  importCsvError: 'Помилка читання файлу',
  importCsvCancel: 'Скасовано',
  importCsvSectionTitle: 'Імпорт виписок (CSV)',
  importCsvSelectAccount: 'Прив\'язати до картки',
  importCsvNoAccounts: 'Спочатку додайте рахунок у розділі «Картки»',
  importCsvNoTx: 'Не знайдено транзакцій у файлі.',
  importCsvImportedTitle: '{label}: Імпортовано',
  importDuplicatesTitle: 'Можливі дублікати',
  importDuplicatesMessage: 'З {dup} із {total} транзакцій збігаються з уже наявними (дата, час, сума, платформа, назва). Додати їх знову?',
  importAddAnyway: 'Все одно додати',
  importRejectDuplicates: 'Відхилити',
  importCurrencyLabel: 'Валюта для запису транзакцій',
  importCurrencyAccount: 'Валюта рахунку ({currency})',
  importCurrencyOperation: 'Валюта операції (з CSV)',

  done: 'Готово',
  yes: 'Так',
  no: 'Ні',
  datePickerDefaultTitle: 'Оберіть дату',

  plannerSourceFrom: 'Від:',
  plannerSourceTo: 'Куди:',
  plannerReceived: 'Отримано',
  plannerFreqOnce: 'Один раз',
  plannerFreqWeekly: 'Щотижня',
  plannerFreqMonthly: 'Щомісяця',
  plannerFreqCustom: 'Кастомно',
  plannerFillRequired: 'Заповніть назву та суму.',
  plannerAccountError: 'Не вдалося визначити рахунок.',
  plannerNamePlaceholder: 'Зарплата, фріланс...',
  plannerSourceLabelExpense: 'Куди / на що',
  plannerSourceLabelIncome: 'Джерело',
  plannerSourcePlaceholderExpense: 'Оренда, підписка...',
  plannerSourcePlaceholderIncome: 'Від кого / звідки',
  plannerCommentPlaceholder: 'Коментар...',
  plannerConfirmTitle: 'Підтвердження',
  plannerMarkPaidConfirm: 'Позначити як оплачено?',
  plannerMarkReceivedConfirm: 'Позначити надходження як отримане?',
  plannerCancelTitle: 'Скасування',
  plannerCancelConfirm: 'Скасувати плановий запис?',
  plannerStatusPending: '⏳ Очікується',
  plannerStatusPaid: '✅ Оплачено',
  plannerStatusReceived: '✅ Отримано',
  plannerStatusConfirmed: '✅ Підтверджено',
  plannerStatusOverdue: '⚠️ Прострочено',
  plannerStatusCancelled: '✗ Скасовано',
  plannerOverdueShort: 'прострочено',

  settingsResetData: 'Скидання даних',
  settingsResetDataHint: 'Видаляє всі транзакції та аналітику',
  settingsResetDataConfirm: 'Ви впевнені? Всі транзакції будуть видалені без можливості відновлення.',
  settingsResetSettings: 'Скидання налаштувань',
  settingsResetSettingsHint: 'Повертає всі налаштування до заводських',
  settingsResetSettingsConfirm: 'Це видалить мову, тему, валюти та API-ключі. Продовжити?',
  settingsDanger: 'Небезпечна зона',

  settingsAnimSpeed: 'Швидкість анімацій',
  settingsAnimSpeedHint: 'Повільніше ← → швидше',
  settingsTransparency: 'Прозорість',
  settingsTransparencyHint: '0% — непрозоро, 100% — максимальна прозорість',
  settingsTransparencyPreview: 'Приклад панелі',
  settingsTransparencyPreviewHint: 'Так виглядатимуть картки та секції',

  analyticsExcludeSelfTransfers: 'Виключати перекази між власними рахунками',
  analyticsIncludeSelfTransfers: 'Враховувати перекази між власними рахунками',

  dateConfirmYear: 'Підтвердити рік',
  dateConfirmMonth: 'Підтвердити місяць',
  dateConfirmDay: 'Підтвердити дату',

  settingsAddAccount: 'Додати картку',
  settingsAddAccountName: 'Назва рахунку',
  settingsPlatform: 'Платформа',
  settingsCategoryRules: 'Правила категорій',
  settingsCategoryRulesHint: 'Автовизначення категорії за MCC, описом, сумою та платформою',
  settingsAddRule: 'Додати правило',
  settingsEditRule: 'Редагувати правило',
  settingsRuleName: 'Назва правила',
  settingsRuleNameOptional: 'Необовʼязково — згенерується автоматично',
  settingsRuleOptionalHint: 'Заповніть поле, умову, значення та категорію. Назва та пріоритет — необовʼязкові.',
  settingsRuleField: 'Поле',
  settingsRuleOp: 'Умова',
  settingsRuleValue: 'Значення',
  settingsRuleCategory: 'Категорія',
  settingsRulePriority: 'Пріоритет',
  ruleFieldMcc: 'MCC',
  ruleFieldDescription: 'Опис',
  ruleFieldAmount: 'Сума',
  ruleFieldPlatform: 'Платформа',
  ruleFieldType: 'Тип',
  ruleFieldCurrency: 'Валюта',
  ruleOpContains: 'містить',
  ruleOpEquals: 'дорівнює',
  ruleOpRegex: 'regex',
  ruleOpRange: 'діапазон',

  catFood: 'Продукти',
  catTransport: 'Транспорт',
  catHealth: 'Здоров\'я',
  catClothing: 'Одяг',
  catSubscriptions: 'Підписки',
  catIncome: 'Надходження',
  catOther: 'Інше',
};

const en: Translations = {
  tabDashboard: 'Home',
  tabTransactions: 'Transactions',
  tabPlanner: 'Planner',
  tabAnalytics: 'Analytics',
  tabSettings: 'Settings',

  dashTotalBalance: 'Total Balance',
  dashAccounts: 'Accounts',
  dashAddAccounts: 'Add accounts in Settings',
  dashUpcoming: 'Upcoming Income',
  dashRecentTx: 'Recent Transactions',
  dashNoTx: 'No transactions yet.\nConnect accounts in Settings.',
  dashExchangeRates: 'Exchange Rates',
  dashBuy: 'Buy',
  dashSell: 'Sell',
  dashRefresh: 'Refresh',
  dashEditCard: 'Edit Card',
  dashCardName: 'Card Name',
  dashCardColor: 'Card Color',
  dashBaseCurrency: 'Exchange:',

  txSearch: 'Search by description...',
  txNoResults: 'No transactions found',
  txFilters: 'Filters',
  txPlatforms: 'Platforms',
  txFilterAccounts: 'Accounts',
  txFilterAll: 'All',
  txTypes: 'Transaction Type',
  txCurrency: 'Currency',
  txReset: 'Reset',
  txApply: 'Apply',
  txDateFrom: 'From',
  txDateTo: 'To',
  txCount: 'transactions',
  txFee: 'fee',
  txTransaction: 'Transaction',
  txExpandFilters: 'Expand',
  txCollapseFilters: 'Collapse',

  analyticsThisMonth: 'This Month',
  analyticsLastMonth: 'Last Month',
  analyticsThisYear: 'This Year',
  analyticsLastYear: 'Last Year',
  analyticsAll: 'All Time',
  analyticsCustom: 'Custom',
  analyticsClearFilter: 'Clear',
  analyticsIncome: 'Income',
  analyticsExpenses: 'Expenses',
  analyticsFees: 'Fees',
  analyticsResult: 'Result',
  analyticsIncomeByPeriod: 'Income',
  analyticsExpenseByPeriod: 'Expenses',
  analyticsIncomesBySource: 'Income Sources',
  analyticsExpensesByPlatform: 'Expenses by Platform',
  analyticsStatsByPlatform: 'Platform Statistics',
  analyticsIncomeAndExpense: 'Income & Expenses',
  analyticsTopCategories: 'Top Expense Categories',
  analyticsNoData: 'No data for selected period',
  analyticsDaily: 'By Day',
  analyticsMonthly: 'By Month',
  analyticsShowIncome: 'Income',
  analyticsShowExpense: 'Expenses',
  analyticsTx: 'transactions',

  settingsAppearance: 'App Appearance',
  settingsUserPreferences: 'User Preferences',
  settingsApiKeys: 'API Keys',
  settingsCards: 'Card Settings',
  settingsTheme: 'Theme',
  settingsAccentColor: 'Accent Color',
  settingsLanguage: 'Language',
  settingsHomeCurrency: 'Home Currency',
  settingsHomeCurrencyHint: 'Currency used to display the total balance on the home screen',
  settingsCurrencies: 'Display Currencies',
  settingsCurrenciesHint: 'Select currencies to show exchange rates on the home screen',
  settingsPlatforms: 'Platform Connections',
  settingsPlatformsHint: 'Tokens are stored in the device\'s secure storage (Keychain / Keystore).',
  settingsAccounts: 'Accounts',
  settingsNoAccounts: 'Your accounts will appear here after connecting a platform and syncing.',
  settingsAbout: 'Finance Control v1.0',
  settingsAboutLocal: 'All data is stored locally on the device.\nNo cloud servers.',
  settingsSyncMono: 'Sync Monobank',
  settingsSyncing: 'Syncing…',
  settingsApiRateLimit: 'Request {current} of {total} · API limit: ~62s between requests',
  settingsMonobankInstructions: '1. Open the Monobank app on your phone\n2. Tap the ⚙️ (gear) icon in the top right corner\n3. Scroll down and find "For Developers"\n   — or open https://api.monobank.ua in a browser\n4. Tap "Confirm access" and confirm in the app\n5. Copy the token and paste it in the field below\n\n📋 Example of what the token looks like:\nuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n(letter «u» at the start, then 44 characters — letters and digits)\n\n⚠️ Token expires after 30 days without use. If inactive, generate a new one.',
  settingsIbkrTokenInstructions: '── HOW TO GET FLEX TOKEN ──\n\n1. Open: https://portal.interactivebrokers.com\n2. Log in to your IBKR account (Client Portal)\n3. In the left/top menu: Performance & Reports\n4. Choose: Flex Queries\n5. On the Flex Queries page find "Manage Flex Tokens" (top right)\n6. Click "+ Create Token"\n7. Copy the generated token and paste it below\n\n📋 Example Flex Token:\nAbCdEfGhIj1234567890AbCdEfGhIj12345678\n(38 chars: letters and digits, no spaces)\n\n⚠️ Token is shown only once! Copy immediately.',
  settingsIbkrQueryInstructions: '── HOW TO CREATE A FLEX QUERY ──\n\nA Flex Query is a custom report IBKR generates on demand.\n\n1. Go to Client Portal: https://portal.interactivebrokers.com\n2. Navigate: Performance & Reports → Flex Queries\n3. Click "+ Create" → choose "Activity Flex Query"\n4. Enter a name (e.g. "Finance Export")\n5. In "Sections" check:\n   ✅ Cash Transactions\n   ✅ Trades (if trading activity needed)\n6. Delivery Configuration:\n   • Format: XML\n   • Period: Last Business Day (or Custom Date Range)\n7. General Configuration:\n   • Date Format: yyyyMMdd\n   • Time Format: HHmmss\n8. Click "Continue" → "Create"\n9. After saving, the numeric ID appears next to the query name\n10. Copy the ID and paste it below\n\n📋 Example Query ID:\n1234567\n(6–8 digits, numbers only)',
  settingsSaltEdgeInstructions: '1. Open https://www.saltedge.com in a browser\n2. Register or log in to your account\n3. Go to: My Applications → click "+ Create Application"\n4. Fill in the form and save the application\n5. Copy the "App ID" (not Secret!) and paste it below\n\n📋 Example of what a Salt Edge App ID looks like:\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n(long string of Latin letters and digits)',
  settingsHowToGet: 'How to get?',

  themeDark: 'Dark Blue',
  themeCursor: 'Dark Grey',
  themeOled: 'OLED Black',
  themeLight: 'Light',

  platformMonobank: 'Monobank',
  platformIbkr: 'Interactive Brokers',
  platformPrivatbank: 'PrivatBank',
  platformZen: 'Zen',
  platformManual: 'Manual',

  typeIncome: 'Income',
  typeExpense: 'Expense',
  typeTransfer: 'Transfer',
  typeFee: 'Fee',

  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  reset: 'Reset',
  apply: 'Apply',
  connected: 'Connected',
  disconnect: 'Disconnect',
  saved: 'Saved',
  error: 'Error',
  confirm: 'Confirm',
  edit: 'Edit',
  deleteAccount: 'Delete account?',
  deleteAccountConfirm: 'Transactions will remain in the database',
  txWillRemain: 'Transactions will remain in the database',
  deleteToken: 'Delete token?',
  deleteTokenConfirm: 'will be deleted',
  tokenSaved: 'Saved',
  tokenSavedHint: 'saved in secure storage',
  pasteToken: 'Paste token...',

  months: ['January','February','March','April','May','June',
           'July','August','September','October','November','December'],
  monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  weekdays: ['Mo','Tu','We','Th','Fr','Sa','Su'],

  overdue: 'Overdue',
  today: 'Today',
  inDays: 'in {n} days',
  commissionShort: 'fee',
  plannerDeleteConfirm: 'Delete entry?',
  plannerDeleteHint: 'This action cannot be undone',
  plannerIncome: 'Income',
  plannerExpense: 'Expense',
  plannerAddIncome: 'Add income',
  plannerAddExpense: 'Add expense',
  plannerPaid: 'Paid',
  plannerEditTitle: 'Edit entry',
  plannerAccount: 'Account',

  tagLabel: 'Tag',
  tagNoTag: 'No tag',
  tagEdit: 'Edit tag',
  tagSearch: 'Category',
  tagEntertainment: 'Entertainment',
  tagUtilities: 'Utilities',
  tagElectronics: 'Electronics',
  tagSelfTransfer: 'Self Transfers',
  tagTransfer: 'Transfers',
  tagTopUp: 'Top Up',

  txDetail: 'Transaction Details',
  txAccount: 'Account',
  txDescription: 'Description',
  txCategory: 'Category',
  txPlatform: 'Platform',
  txExactDate: 'Date & Time',
  txMcc: 'MCC code',

  settingsReAutoTag: 'Auto-detect Tags',
  settingsReAutoTagHint: 'Sets tags for untagged transactions based on MCC and description',
  settingsCardsAndTags: 'Cards & Tags',
  settingsRetagging: 'Detecting tags…',
  settingsRetagSuccess: 'Updated tags and categories for {count} transactions.',
  settingsDataDeleted: 'All transactions deleted.',
  settingsResetDone: 'Settings reset to factory defaults.',
  settingsTokenMissing: 'Token missing',
  settingsTokenMissingHint: 'Save your Monobank X-Token first.',
  settingsMonoConnecting: 'Connecting to Monobank…',
  settingsMonoRateLimit: 'API rate limit — waiting 65 s…',
  settingsMonoPause: 'Pause between requests…',
  settingsMonoSyncDone: 'Sync complete!',
  settingsMonoSyncNoNew: 'No new transactions found.',
  settingsSyncError: 'Sync error',
  settingsMonoApiSync: 'API — auto-sync (90 days)',
  settingsCsvImportLabel: 'CSV — statement import',
  settingsMonoCsvInstructions: '1. Open the Monobank app\n2. On the home screen tap "···" (three dots)\n3. Go to: Statement → Download (.csv)\n4. Send the file to this device\n5. Select a card below and tap "Import file"\n\n✅ CSV contains full available history with no limits!',
  settingsMonobankLimit: 'Monobank API Limit',
  settingsMonobankLimitHint: 'Monobank only allows loading the last 90 days of statements. Older data is unavailable via API. The cutoff date is 90 days before the first sync.',
  settingsZen: 'ZEN Money (CSV)',
  settingsZenHint: 'Integration via exported statement file (CSV/OFX from ZEN app)',
  settingsZenInstructions: '1. Open the ZEN Money app\n2. Go to: Profile → Statements / Export\n3. Choose CSV format and download the file\n4. Tap "Import CSV" below and select the file\n\n⚠️ ZEN Money has no open personal banking API. CSV file import is used instead.',
  settingsPrivatbank: 'PrivatBank (CSV)',
  settingsPrivatbankHint: 'Integration via PrivatBank statement export',
  settingsPrivatbankInstructions: '1. Log in to Privat24 (app or web.privatbank.ua)\n2. Statements → Download → CSV or XLS format\n3. Tap "Import" below and select the file\n\n⚠️ PrivatBank personal API requires a corporate connection. Manual file import is used instead.',

  importCsvBtn: 'Import file',
  importCsvLoading: 'Reading file…',
  importCsvSuccess: 'Added {count} transactions',
  importCsvSkipped: 'Skipped {count} duplicates',
  importCsvError: 'File read error',
  importCsvCancel: 'Cancelled',
  importCsvSectionTitle: 'Statement import (CSV)',
  importCsvSelectAccount: 'Link to card',
  importCsvNoAccounts: 'Add an account in Cards section first',
  importCsvNoTx: 'No transactions found in the file.',
  importCsvImportedTitle: '{label}: Imported',
  importDuplicatesTitle: 'Possible duplicates',
  importDuplicatesMessage: '{dup} of {total} transactions match existing ones (date, time, amount, platform, name). Add them again?',
  importAddAnyway: 'Add anyway',
  importRejectDuplicates: 'Reject',
  importCurrencyLabel: 'Transaction currency',
  importCurrencyAccount: 'Account currency ({currency})',
  importCurrencyOperation: 'Operation currency (from CSV)',

  done: 'Done',
  yes: 'Yes',
  no: 'No',
  datePickerDefaultTitle: 'Select date',

  plannerSourceFrom: 'From:',
  plannerSourceTo: 'To:',
  plannerReceived: 'Received',
  plannerFreqOnce: 'Once',
  plannerFreqWeekly: 'Weekly',
  plannerFreqMonthly: 'Monthly',
  plannerFreqCustom: 'Custom',
  plannerFillRequired: 'Fill in name and amount.',
  plannerAccountError: 'Could not determine account.',
  plannerNamePlaceholder: 'Salary, freelance...',
  plannerSourceLabelExpense: 'Where / what for',
  plannerSourceLabelIncome: 'Source',
  plannerSourcePlaceholderExpense: 'Rent, subscription...',
  plannerSourcePlaceholderIncome: 'From whom / where',
  plannerCommentPlaceholder: 'Comment...',
  plannerConfirmTitle: 'Confirm',
  plannerMarkPaidConfirm: 'Mark as paid?',
  plannerMarkReceivedConfirm: 'Mark income as received?',
  plannerCancelTitle: 'Cancel',
  plannerCancelConfirm: 'Cancel planned entry?',
  plannerStatusPending: '⏳ Pending',
  plannerStatusPaid: '✅ Paid',
  plannerStatusReceived: '✅ Received',
  plannerStatusConfirmed: '✅ Confirmed',
  plannerStatusOverdue: '⚠️ Overdue',
  plannerStatusCancelled: '✗ Cancelled',
  plannerOverdueShort: 'overdue',

  settingsResetData: 'Reset Data',
  settingsResetDataHint: 'Deletes all transactions and analytics',
  settingsResetDataConfirm: 'Are you sure? All transactions will be permanently deleted.',
  settingsResetSettings: 'Reset Settings',
  settingsResetSettingsHint: 'Restores all settings to factory defaults',
  settingsResetSettingsConfirm: 'This will delete your language, theme, currencies and API keys. Continue?',
  settingsDanger: 'Danger Zone',

  settingsAnimSpeed: 'Animation speed',
  settingsAnimSpeedHint: 'Slower ← → faster',
  settingsTransparency: 'Transparency',
  settingsTransparencyHint: '0% — opaque, 100% — maximum transparency',
  settingsTransparencyPreview: 'Panel preview',
  settingsTransparencyPreviewHint: 'How cards and sections will look',

  analyticsExcludeSelfTransfers: 'Exclude transfers between own accounts',
  analyticsIncludeSelfTransfers: 'Include transfers between own accounts',

  dateConfirmYear: 'Confirm year',
  dateConfirmMonth: 'Confirm month',
  dateConfirmDay: 'Confirm date',

  settingsAddAccount: 'Add account',
  settingsAddAccountName: 'Account name',
  settingsPlatform: 'Platform',
  settingsCategoryRules: 'Category rules',
  settingsCategoryRulesHint: 'Auto-detect category by MCC, description, amount and platform',
  settingsAddRule: 'Add rule',
  settingsEditRule: 'Edit rule',
  settingsRuleName: 'Rule name',
  settingsRuleNameOptional: 'Optional — auto-generated if empty',
  settingsRuleOptionalHint: 'Set field, condition, value and category. Name and priority are optional.',
  settingsRuleField: 'Field',
  settingsRuleOp: 'Condition',
  settingsRuleValue: 'Value',
  settingsRuleCategory: 'Category',
  settingsRulePriority: 'Priority',
  ruleFieldMcc: 'MCC',
  ruleFieldDescription: 'Description',
  ruleFieldAmount: 'Amount',
  ruleFieldPlatform: 'Platform',
  ruleFieldType: 'Type',
  ruleFieldCurrency: 'Currency',
  ruleOpContains: 'contains',
  ruleOpEquals: 'equals',
  ruleOpRegex: 'regex',
  ruleOpRange: 'range',

  catFood: 'Food',
  catTransport: 'Transport',
  catHealth: 'Health',
  catClothing: 'Clothing',
  catSubscriptions: 'Subscriptions',
  catIncome: 'Income',
  catOther: 'Other',
};

export const TRANSLATIONS: Record<Language, Translations> = { uk, en };
