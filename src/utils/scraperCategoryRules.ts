import type { CategoryKey } from './categoryRegistry';
import type { CategoryRule, RuleMatchField, RuleMatchOp } from './categoryRules';
import { getDatabase } from '../db/migrations';

/** Lowest priority — any user rule (Low=1+) wins. */
export const SCRAPER_RULE_PRIORITY = 0;

export const SCRAPER_RULE_ID_PREFIX = 'rule_scraper_';

export function isScraperCategoryRule(rule: Pick<CategoryRule, 'id' | 'name' | 'priority'>): boolean {
  return rule.id.startsWith(SCRAPER_RULE_ID_PREFIX)
    || rule.name.startsWith('Авто · ')
    || rule.name.startsWith('Auto · ');
}

/** App-seeded rules (scrapers + essential IBKR), not user-created. */
export function isAppCreatedCategoryRule(rule: Pick<CategoryRule, 'id' | 'name' | 'priority'>): boolean {
  if (isScraperCategoryRule(rule)) return true;
  if (rule.name === 'IBKR BUY' || rule.name === 'IBKR SELL') return true;
  if (rule.name.startsWith('IBKR ')) return true;
  return false;
}

type ScraperDef = {
  slug: string;
  nameUk: string;
  categoryKey: CategoryKey;
  matchField: RuleMatchField;
  matchOp: RuleMatchOp;
  matchValue: string;
};

/** Built-in bank/CSV scraper heuristics — mirrored into category_rules for visibility. */
export const SCRAPER_CATEGORY_DEFS: ScraperDef[] = [
  // Description patterns (from tags.ts DESC_PATTERNS + income heuristics)
  {
    slug: 'cancel',
    nameUk: 'Авто · Скасування',
    categoryKey: 'cancellation',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: '^Cancellation\\.|^Скасування\\.',
  },
  {
    slug: 'dividend',
    nameUk: 'Авто · Дивіденди',
    categoryKey: 'dividend',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'dividend|дивіденд',
  },
  {
    slug: 'fee',
    nameUk: 'Авто · Комісії',
    categoryKey: 'fee',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'withholding|commission|broker.?fee|processing fee|комісі',
  },
  {
    slug: 'forex',
    nameUk: 'Авто · Обмін валют',
    categoryKey: 'forex',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: '\\b(EUR\\.USD|USD\\.EUR|GBP\\.USD|forex|currency conversion)\\b',
  },
  {
    slug: 'buy',
    nameUk: 'Авто · BUY (інвестиції)',
    categoryKey: 'investment',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: '^BUY\\b',
  },
  {
    slug: 'from_p2p',
    nameUk: 'Авто · From: (надходження)',
    categoryKey: 'income',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: '^From:\\s+',
  },
  {
    slug: 'top_up',
    nameUk: 'Авто · Поповнення / зарплата',
    categoryKey: 'top_up',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'поповнення|пополнение|top.?up|зарахування|зарплат|deposit payout|cashback withdrawal|кешбек|easyp|city24|abnk|стипенд',
  },
  {
    slug: 'food_shops',
    nameUk: 'Авто · Продукти (магазини)',
    categoryKey: 'food',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'атб|сільпо|novus|ашан|metro(?!polis)|billa|lidl|фора|таврія|varus|buslyk|буслик|наш крам|клас|auchan|silpo|aldi|gastronom|thrash|hastronom|pekarnya|buloshna',
  },
  {
    slug: 'subscriptions',
    nameUk: 'Авто · Підписки',
    categoryKey: 'subscriptions',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'netflix|spotify|youtube.*premium|google.*music|apple tv|subscription|підписк',
  },
  {
    slug: 'games',
    nameUk: 'Авто · Ігри / Steam',
    categoryKey: 'entertainment',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'steam|steamgames|xbox|playstation|google play|app store|battlefield|clash of clans|roblox|minecraft',
  },
  {
    slug: 'restaurants',
    nameUk: 'Авто · Кафе / кіно',
    categoryKey: 'entertainment',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'mcdonalds|mcdonald|kebab|restaurant|кафе|ресторан|mushrooms|istanbul|pizza|кіно|cinema|multiplex|imax|планета кіно|ukino|okko(?!\\s*fuel)|megogo|kinopolis|planete|kinogo',
  },
  {
    slug: 'electronics',
    nameUk: 'Авто · Електроніка',
    categoryKey: 'electronics',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'rozetka|comfy|allo|фокстрот|moyo|apple store|samsung store|xiaomi|eldorado|технополіс|re:store|brain|magazin brain',
  },
  {
    slug: 'transport',
    nameUk: 'Авто · Транспорт',
    categoryKey: 'transport',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'uber|bolt|uklon|метро|залізниц|railway|petrol|okko fuel|wog|socar|shell|azs|автобус',
  },
  {
    slug: 'health',
    nameUk: "Авто · Здоров'я",
    categoryKey: 'health',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'аптек|pharmacy|drug store|medical|клінік|hospital',
  },
  {
    slug: 'p2p_transfer',
    nameUk: 'Авто · Перекази (P2P)',
    categoryKey: 'transfer',
    matchField: 'description',
    matchOp: 'regex',
    matchValue: 'переказ|відправлено на|перевод|p2p|card2card|transfer to card',
  },

  // MCC groups (from tags.ts MCC_TO_CATEGORY)
  {
    slug: 'mcc_entertainment',
    nameUk: 'Авто · MCC розваги',
    categoryKey: 'entertainment',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(5812|5813|5814|7832|7922|7941|7991|7993|7994|7995|7996|7999|7011|5945|5942|5815|5816|5817|5818|5192)$',
  },
  {
    slug: 'mcc_food',
    nameUk: 'Авто · MCC продукти',
    categoryKey: 'food',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(5411|5412|5441|5451|5462|5499)$',
  },
  {
    slug: 'mcc_health',
    nameUk: "Авто · MCC здоров'я",
    categoryKey: 'health',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(5912|5122)$',
  },
  {
    slug: 'mcc_clothing',
    nameUk: 'Авто · MCC одяг',
    categoryKey: 'clothing',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(5311|5331|5691|5621|5699|5661|5631|5651|5310)$',
  },
  {
    slug: 'mcc_utilities',
    nameUk: 'Авто · MCC побут',
    categoryKey: 'utilities',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(4812|4813|4814|4900|5977|5085|5251|7299)$',
  },
  {
    slug: 'mcc_transport',
    nameUk: 'Авто · MCC транспорт',
    categoryKey: 'transport',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(5511|7523|7542|5541|4111|4112|4121|4131)$',
  },
  {
    slug: 'mcc_subscriptions',
    nameUk: 'Авто · MCC підписки',
    categoryKey: 'subscriptions',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(7372)$',
  },
  {
    slug: 'mcc_electronics',
    nameUk: 'Авто · MCC електроніка',
    categoryKey: 'electronics',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(5065|5734|5045|5712|5732|5044)$',
  },
  {
    slug: 'mcc_transfer',
    nameUk: 'Авто · MCC перекази',
    categoryKey: 'transfer',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(4829|6012)$',
  },
  {
    slug: 'mcc_top_up',
    nameUk: 'Авто · MCC поповнення',
    categoryKey: 'top_up',
    matchField: 'mcc',
    matchOp: 'regex',
    matchValue: '^(6011|6010|6050)$',
  },
];

function scraperId(slug: string): string {
  return `${SCRAPER_RULE_ID_PREFIX}${slug}`;
}

const SCRAPER_NAME_EN: Record<string, string> = {
  cancel: 'Auto · Cancellation',
  dividend: 'Auto · Dividends',
  fee: 'Auto · Fees',
  forex: 'Auto · FX',
  buy: 'Auto · BUY (investments)',
  from_p2p: 'Auto · From: (incoming)',
  top_up: 'Auto · Top-up / salary',
  food_shops: 'Auto · Groceries',
  subscriptions: 'Auto · Subscriptions',
  games: 'Auto · Games / Steam',
  restaurants: 'Auto · Cafés / cinema',
  electronics: 'Auto · Electronics',
  transport: 'Auto · Transport',
  health: 'Auto · Health',
  p2p_transfer: 'Auto · P2P transfer',
  mcc_entertainment: 'Auto · MCC entertainment',
  mcc_food: 'Auto · MCC food',
  mcc_health: 'Auto · MCC health',
  mcc_clothing: 'Auto · MCC clothing',
  mcc_utilities: 'Auto · MCC utilities',
  mcc_transport: 'Auto · MCC transport',
  mcc_subscriptions: 'Auto · MCC subscriptions',
  mcc_electronics: 'Auto · MCC electronics',
  mcc_transfer: 'Auto · MCC transfers',
  mcc_top_up: 'Auto · MCC top-up',
};

/** Localized display name for scraper rules; keeps user renames. */
export function scraperRuleDisplayName(
  rule: Pick<CategoryRule, 'id' | 'name'>,
  language: 'uk' | 'en',
): string {
  if (!rule.id.startsWith(SCRAPER_RULE_ID_PREFIX)) return rule.name;
  const slug = rule.id.slice(SCRAPER_RULE_ID_PREFIX.length);
  const def = SCRAPER_CATEGORY_DEFS.find((d) => d.slug === slug);
  if (!def) return rule.name;
  const en = SCRAPER_NAME_EN[slug];
  if (rule.name !== def.nameUk && rule.name !== en) return rule.name;
  return language === 'en' ? (en ?? rule.name.replace(/^Авто · /, 'Auto · ')) : def.nameUk;
}

/**
 * Upsert built-in scraper heuristics into category_rules at priority 0.
 * Preserves user `enabled` and custom `name` if the rule already exists.
 * Match fields are refreshed from code defs so pattern updates reach existing installs.
 */
let scrapersEnsured = false;

export function markScraperRuleDeleted(id: string): void {
  if (!id.startsWith(SCRAPER_RULE_ID_PREFIX)) return;
  try {
    getDatabase().runSync(
      'INSERT OR IGNORE INTO deleted_scraper_rules (id) VALUES (?)',
      [id],
    );
  } catch { /* table may not exist yet on first boot */ }
}

export function ensureScraperCategoryRules(force = false): void {
  if (scrapersEnsured && !force) return;

  const db = getDatabase();
  const now = Date.now();

  let deleted = new Set<string>();
  try {
    deleted = new Set(
      db.getAllSync<{ id: string }>('SELECT id FROM deleted_scraper_rules').map((r) => r.id),
    );
  } catch { /* ignore */ }

  for (const def of SCRAPER_CATEGORY_DEFS) {
    const id = scraperId(def.slug);
    if (deleted.has(id)) continue;

    const existing = db.getFirstSync<{ enabled: number; created_at: number }>(
      'SELECT enabled, created_at FROM category_rules WHERE id = ?',
      [id],
    );

    if (!existing) {
      db.runSync(
        `INSERT INTO category_rules
         (id, name, category_key, priority, match_field, match_op, match_value, enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          id, def.nameUk, def.categoryKey, SCRAPER_RULE_PRIORITY,
          def.matchField, def.matchOp, def.matchValue, now,
        ],
      );
    } else {
      // Refresh match fields from code defs; keep enabled + name (user may have renamed)
      db.runSync(
        `UPDATE category_rules
         SET category_key = ?, priority = ?, match_field = ?, match_op = ?, match_value = ?
         WHERE id = ?`,
        [
          def.categoryKey, SCRAPER_RULE_PRIORITY,
          def.matchField, def.matchOp, def.matchValue, id,
        ],
      );
    }
  }

  scrapersEnsured = true;
}
