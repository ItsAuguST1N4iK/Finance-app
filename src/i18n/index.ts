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
}

const uk: Translations = {
  tabDashboard: 'Головна',
  tabTransactions: 'Транзакції',
  tabPlanner: 'Планер',
  tabAnalytics: 'Аналітика',
  tabSettings: 'Налашт.',

  dashTotalBalance: 'Загальний баланс (UAH)',
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
  analyticsCustom: 'Довільний',
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
  settingsIbkrTokenInstructions: '1. Відкрий браузер і перейди на сайт: https://www.interactivebrokers.com\n2. Натисни "Увійти" та зайди у Client Portal\n3. У верхньому меню знайди: Reports → Flex Queries\n4. На сторінці Flex Queries клікни "Manage Flex Tokens" (вгорі праворуч)\n5. Натисни "+ Створити токен" і скопіюй його\n6. Вставте токен у поле нижче\n\n📋 Приклад того, як виглядає IBKR Flex Token:\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n(38 символів: латинські літери та цифри, без пробілів)',
  settingsIbkrQueryInstructions: '1. У Client Portal перейди: Reports → Flex Queries\n2. Знайди існуючий Flex Query або створи новий:\n   — Натисни "+ Create" → вибери потрібні параметри → збережи\n3. Поруч із назвою Query ти побачиш числовий ID\n4. Скопіюй цей ID та вставте у поле нижче\n\n📋 Приклад того, як виглядає Query ID:\n000000\n(6–7 цифр, лише числа)',
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
};

const en: Translations = {
  tabDashboard: 'Home',
  tabTransactions: 'Transactions',
  tabPlanner: 'Planner',
  tabAnalytics: 'Analytics',
  tabSettings: 'Settings',

  dashTotalBalance: 'Total Balance (UAH)',
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
  settingsIbkrTokenInstructions: '1. Open your browser and go to: https://www.interactivebrokers.com\n2. Click "Log In" and enter the Client Portal\n3. In the top menu find: Reports → Flex Queries\n4. On the Flex Queries page click "Manage Flex Tokens" (top right)\n5. Click "+ Create Token" and copy it\n6. Paste the token in the field below\n\n📋 Example of what an IBKR Flex Token looks like:\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n(38 characters: Latin letters and digits, no spaces)',
  settingsIbkrQueryInstructions: '1. In Client Portal go to: Reports → Flex Queries\n2. Find an existing Flex Query or create a new one:\n   — Click "+ Create" → configure parameters → save\n3. Next to the Query name you will see a numeric ID\n4. Copy that ID and paste it in the field below\n\n📋 Example of what a Query ID looks like:\n000000\n(6–7 digits, numbers only)',
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
};

export const TRANSLATIONS: Record<Language, Translations> = { uk, en };
