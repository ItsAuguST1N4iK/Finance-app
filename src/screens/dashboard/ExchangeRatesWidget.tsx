import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRatesStore } from '../../store/exchangeRatesSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { currencySymbol } from '../../utils/currency';
import { ALL_CURRENCIES } from '../../constants/currencies';
import { getDatabase } from '../../db/migrations';
import { FadeModal } from '../../components/FadeModal';
import { PressableScale } from '../../components/PressableScale';
import { HourglassSpinner } from '../../components/HourglassSpinner';
import { ChevronToggle } from '../../components/MotionIcons';
import { radius, stroke } from '../../theme/tokens';

// ─── Exchange Rates Widget ────────────────────────────

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP'];

export function ExchangeRatesWidget() {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const { rates, updatedAt, isLoading, fetchRates } = useExchangeRatesStore();
  const [currencies,    setCurrencies]    = useState<string[]>(DEFAULT_CURRENCIES);
  const [baseCurrency,  setBaseCurrency]  = useState<string>('UAH');
  const [pickerVisible, setPickerVisible] = useState(false);

  function loadSettings() {
    try {
      const db  = getDatabase();
      const row = db.getFirstSync<{ preferred_currencies: string | null; base_currency_exchange: string | null }>(
        'SELECT preferred_currencies, base_currency_exchange FROM settings WHERE id = 1'
      );
      if (row?.preferred_currencies) {
        const parsed = JSON.parse(row.preferred_currencies) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setCurrencies(parsed);
      }
      if (row?.base_currency_exchange) {
        setBaseCurrency(row.base_currency_exchange);
      }
    } catch {}
  }

  useEffect(() => {
    loadSettings();
    fetchRates();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  function saveBaseCurrency(code: string) {
    setBaseCurrency(code);
    setPickerVisible(false);
    try {
      getDatabase().runSync(
        'UPDATE settings SET base_currency_exchange = ? WHERE id = 1',
        [code]
      );
    } catch {}
  }

  /** Compute display rates relative to baseCurrency */
  function getDisplayRates(): Array<{ code: string; buy: number; sell: number }> {
    const displayCodes = currencies.filter((c) => c !== baseCurrency);
    // Add UAH only when base != UAH
    const codesToShow = baseCurrency === 'UAH' ? currencies : [...displayCodes, 'UAH'];

    if (baseCurrency === 'UAH') {
      return rates
        .filter((r) => currencies.includes(r.code))
        .map((r) => ({ code: r.code, buy: r.rateBuy, sell: r.rateSell }));
    }

    const baseRate = rates.find((r) => r.code === baseCurrency);
    if (!baseRate || baseRate.rateBuy === 0 || baseRate.rateSell === 0) return [];

    return codesToShow.flatMap((code) => {
      if (code === 'UAH') {
        return [{ code: 'UAH', buy: 1 / baseRate.rateSell, sell: 1 / baseRate.rateBuy }];
      }
      const r = rates.find((x) => x.code === code);
      if (!r) return [];
      return [{ code, buy: r.rateBuy / baseRate.rateBuy, sell: r.rateSell / baseRate.rateSell }];
    });
  }

  const shownRates = getDisplayRates();

  return (
    <View style={[erStyles.container, cardSurface()]}>
      {/* Header: "Обмін валюти" + currency picker + refresh */}
      <View style={[erStyles.header, { borderBottomColor: theme.border }]}>
        <View style={erStyles.headerLeft}>
          <Text style={[erStyles.baseCurrencyLabel, { color: theme.subtext }]}>{t.dashBaseCurrency}</Text>
          <PressableScale
            style={[erStyles.baseCurrencyBtn, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '66' }]}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={[erStyles.baseCurrencyBtnText, { color: theme.accent }]}>
              {currencySymbol(baseCurrency)} {baseCurrency}
            </Text>
            <ChevronToggle expanded={pickerVisible} size={12} color={theme.accent} />
          </PressableScale>
        </View>
        <PressableScale onPress={fetchRates} disabled={isLoading} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          {isLoading ? (
            <HourglassSpinner active size={16} color={theme.accent} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={theme.accent} />
          )}
        </PressableScale>
      </View>

      <View style={erStyles.tableHeader}>
        <Text style={[erStyles.colHead, { flex: 2, color: theme.subtext }]}>
          {currencySymbol(baseCurrency)} {baseCurrency}
        </Text>
        <Text style={[erStyles.colHead, { color: theme.subtext }]}>{t.dashBuy}</Text>
        <Text style={[erStyles.colHead, { color: theme.subtext }]}>{t.dashSell}</Text>
      </View>

      {shownRates.map((r) => (
        <View key={r.code} style={[erStyles.row, { borderBottomColor: theme.border }]}>
          <Text style={[erStyles.code, { color: theme.text }]}>
            {currencySymbol(r.code)} {r.code}
          </Text>
          <Text style={[erStyles.rate, { color: theme.income }]}>
            {r.buy.toFixed(r.buy < 1 ? 4 : 2)}
          </Text>
          <Text style={[erStyles.rate, { color: theme.expense }]}>
            {r.sell.toFixed(r.sell < 1 ? 4 : 2)}
          </Text>
        </View>
      ))}

      {updatedAt && (
        <Text style={[erStyles.hint, { color: theme.subtext }]}>
          {new Date(updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      {/* Base currency picker modal */}
      <FadeModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={t.dashBaseCurrency}
      >
        {ALL_CURRENCIES.map((code) => (
          <PressableScale
            key={code}
            style={[erStyles.pickerItem, code === baseCurrency && { backgroundColor: theme.accent + '22' }]}
            contentStyle={erStyles.pickerItemInner}
            onPress={() => saveBaseCurrency(code)}
            scaleTo={0.97}
          >
            <Text style={[erStyles.pickerItemText, { color: code === baseCurrency ? theme.accent : theme.text }]}>
              {currencySymbol(code)} {code}
            </Text>
            {code === baseCurrency && <Ionicons name="checkmark" size={16} color={theme.accent} />}
          </PressableScale>
        ))}
      </FadeModal>
    </View>
  );
}

const erStyles = StyleSheet.create({
  container:    { borderRadius: 14, padding: 14, marginBottom: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 10, marginBottom: 8, borderBottomWidth: 1,
  },
  headerLeft:           { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  baseCurrencyLabel:    { fontSize: 12, fontWeight: '600' },
  baseCurrencyBtn:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5, borderWidth: stroke.width,
  },
  baseCurrencyBtnText:  { fontSize: 13, fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row', paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: 'transparent', marginBottom: 4,
  },
  colHead:  { flex: 1, fontSize: 10, fontWeight: '600', textAlign: 'right' },
  row:      { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1 },
  code:     { flex: 2, fontSize: 13, fontWeight: '600' },
  rate:     { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '500' },
  hint:     { fontSize: 10, marginTop: 8, textAlign: 'right' },
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  pickerSheet: {
    borderRadius: radius.lg, padding: 16, borderWidth: stroke.width, width: '100%',
  },
  pickerTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  pickerItem:     { borderRadius: 8, marginBottom: 2 },
  pickerItemInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8 },
  pickerItemText: { fontSize: 15, fontWeight: '500' },
});
