import { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { CategoryKey } from '../utils/categoryRegistry';
import { CATEGORY_I18N_KEY, ALL_CATEGORY_KEYS } from '../utils/categoryRegistry';
import type { Translations } from '../i18n';
import {
  getCustomCategoryName,
  loadCustomCategories,
  refreshCustomCategoryCache,
} from '../utils/categoryImpact';

function categoryI18n(t: Translations, i18nKey: string): string {
  return (t as unknown as Record<string, string>)[i18nKey] ?? i18nKey;
}

export function useCategoryLabels(): Record<string, string> {
  const { t } = useLanguage();
  return useMemo(() => {
    refreshCustomCategoryCache();
    const out: Record<string, string> = {};
    for (const [key, i18nKey] of Object.entries(CATEGORY_I18N_KEY)) {
      out[key] = categoryI18n(t, i18nKey);
    }
    for (const c of loadCustomCategories()) {
      out[c.key] = c.name;
    }
    return out;
  }, [t]);
}

export function useCategoryLabel(key: CategoryKey | string | null | undefined): string {
  const labels = useCategoryLabels();
  if (!key) return labels.other ?? 'other';
  return labels[key] ?? getCustomCategoryName(key) ?? String(key);
}

export function useAllPickerCategoryKeys(): string[] {
  const labels = useCategoryLabels();
  return useMemo(() => {
    const custom = loadCustomCategories().map((c) => c.key);
    return [...ALL_CATEGORY_KEYS, ...custom];
  }, [labels]);
}
