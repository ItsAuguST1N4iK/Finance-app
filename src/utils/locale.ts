import { enUS, uk } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '../i18n';

export function dateFnsLocale(language: Language): Locale {
  return language === 'en' ? enUS : uk;
}

export function numberLocale(language: Language): string {
  return language === 'en' ? 'en-US' : 'uk-UA';
}
