import { useLanguage } from '../i18n/LanguageContext';

export function useTagLabels(): Record<string, string> {
  const { t } = useLanguage();
  return {
    entertainment: t.tagEntertainment,
    utilities:     t.tagUtilities,
    electronics:   t.tagElectronics,
    self_transfer: t.tagSelfTransfer,
    transfer:      t.tagTransfer,
    top_up:        t.tagTopUp,
  };
}
