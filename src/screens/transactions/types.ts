import type { Platform as Plat, TransactionType } from '../../types';
import { ALL_CURRENCIES } from '../../constants/currencies';

export type FilterPlatform = Exclude<Plat, 'manual'>;

export const PLATFORMS: FilterPlatform[] = ['monobank', 'ibkr', 'privatbank', 'zen'];
export const TYPES: TransactionType[] = ['income', 'expense', 'transfer', 'fee'];
export const CURRENCIES = ALL_CURRENCIES;
