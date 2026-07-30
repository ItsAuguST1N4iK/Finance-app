import { create } from 'zustand';
import type { CurrencyRate } from '../types';
import { ISO_4217_NUMERIC } from '../constants/currencies';

export type { CurrencyRate };

interface ExchangeRatesState {
  rates: CurrencyRate[];
  updatedAt: number | null;
  isLoading: boolean;
  error: string | null;
  fetchRates: () => Promise<void>;
}

export const useExchangeRatesStore = create<ExchangeRatesState>((set) => ({
  rates: [],
  updatedAt: null,
  isLoading: false,
  error: null,

  fetchRates: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('https://api.monobank.ua/bank/currency', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: Array<{
        currencyCodeA: number;
        currencyCodeB: number;
        date: number;
        rateSell?: number;
        rateBuy?: number;
        rateCross?: number;
      }> = await res.json();

      // Keep only pairs where B = UAH (980)
      const rates: CurrencyRate[] = [];
      for (const row of json) {
        if (row.currencyCodeB !== 980) continue;
        const code = ISO_4217_NUMERIC[row.currencyCodeA];
        if (!code) continue;
        rates.push({
          code,
          rateBuy: row.rateBuy ?? row.rateCross ?? 0,
          rateSell: row.rateSell ?? row.rateCross ?? 0,
          rateCross: row.rateCross,
        });
      }

      set({ rates, updatedAt: Date.now(), isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String((e as Error)?.message ?? e) });
    }
  },
}));
