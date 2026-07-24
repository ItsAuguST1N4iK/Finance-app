import { useLanguage } from '../i18n/LanguageContext';
import type { CategoryKey } from '../utils/categoryRegistry';
import { CATEGORY_I18N_KEY } from '../utils/categoryRegistry';
import type { Translations } from '../i18n';

function categoryI18n(t: Translations, i18nKey: string): string {
  return (t as unknown as Record<string, string>)[i18nKey] ?? i18nKey;
}

export function useCategoryLabels(): Record<CategoryKey, string> {
  const { t } = useLanguage();
  const out = {} as Record<CategoryKey, string>;
  for (const [key, i18nKey] of Object.entries(CATEGORY_I18N_KEY)) {
    out[key as CategoryKey] = categoryI18n(t, i18nKey);
  }
  return out;
}

export function useCategoryLabel(key: CategoryKey | string | null | undefined): string {
  const labels = useCategoryLabels();
  if (!key) return labels.other;
  return labels[key as CategoryKey] ?? String(key);
}
