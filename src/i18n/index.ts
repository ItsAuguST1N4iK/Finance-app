export type { Language, Translations } from './types';
export { LANGUAGES, LANGUAGE_LABELS } from './types';
export { uk } from './uk';
export { en } from './en';
import type { Language, Translations } from './types';
import { uk } from './uk';
import { en } from './en';

export const TRANSLATIONS: Record<Language, Translations> = { uk, en };
