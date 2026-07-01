import { create } from 'zustand';

export interface CurrencyRate {
  code: string;      // 'USD', 'EUR', 'GBP', etc.
  rateBuy: number;
  rateSell: number;
  rateCross?: number;
}

interface ExchangeRatesState {
  rates: CurrencyRate[];
  updatedAt: number | null;
  isLoading: boolean;
  error: string | null;
  fetchRates: () => Promise<void>;
}

// ISO 4217 numeric → alpha mapping (subset)
const NUM_TO_ALPHA: Record<number, string> = {
  840: 'USD', 978: 'EUR', 826: 'GBP',
  756: 'CHF', 203: 'CZK', 985: 'PLN',
  124: 'CAD', 36:  'AUD', 392: 'JPY',
  980: 'UAH',
};

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
        const code = NUM_TO_ALPHA[row.currencyCodeA];
        if (!code) continue;
        rates.push({
          code,
          rateBuy:   row.rateBuy   ?? row.rateCross ?? 0,
          rateSell:  row.rateSell  ?? row.rateCross ?? 0,
          rateCross: row.rateCross,
        });
      }

      set({ rates, updatedAt: Date.now(), isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String((e as Error)?.message ?? e) });
    }
  },
}));
