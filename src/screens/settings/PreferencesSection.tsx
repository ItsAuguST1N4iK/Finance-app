import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANGUAGE_LABELS, Language } from '../../i18n';
import { currencySymbol } from '../../utils/currency';
import { AVAILABLE_CURRENCIES } from '../../constants/currencies';
import { savePreferredCurrencies, saveHomeCurrency as persistHomeCurrency } from '../../utils/settingsPrefs';
import { refreshAppData } from '../../services/refreshAppData';
import { Section, GroupLabel } from './Section';
import type { SettingsStyles } from './settingsStyles';

export function PreferencesSection({
  s,
  prefCurrencies,
  setPrefCurrencies,
  homeCurrency,
  setHomeCurrencyState,
}: {
  s: SettingsStyles;
  prefCurrencies: string[];
  setPrefCurrencies: (v: string[]) => void;
  homeCurrency: string;
  setHomeCurrencyState: (v: string) => void;
}) {
  const { theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  function savePrefCurrencies(updated: string[]) {
    setPrefCurrencies(updated);
    savePreferredCurrencies(updated);
  }

  function toggleCurrency(code: string) {
    const updated = prefCurrencies.includes(code)
      ? prefCurrencies.filter((c) => c !== code)
      : [...prefCurrencies, code];
    savePrefCurrencies(updated);
  }

  function saveHomeCurrency(code: string) {
    setHomeCurrencyState(code);
    persistHomeCurrency(code);
    void refreshAppData('all');
  }

  return (
    <Section title={t.settingsUserPreferences} icon="person-circle-outline">
      <GroupLabel label={t.settingsLanguage} />
      <View style={[s.langRow, { marginBottom: 20 }]}>
        {(['uk', 'en'] as Language[]).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[s.langBtn, language === lang && { borderColor: theme.accent, backgroundColor: theme.accent + '18' }]}
            onPress={() => setLanguage(lang)}
          >
            <Text style={[s.langBtnText, { color: language === lang ? theme.accent : theme.subtext }]}>
              {LANGUAGE_LABELS[lang]}
            </Text>
            {language === lang && <Ionicons name="checkmark" size={14} color={theme.accent} />}
          </TouchableOpacity>
        ))}
      </View>

      <GroupLabel label={t.settingsHomeCurrency} />
      <Text style={[s.hintText, { marginBottom: 10 }]}>{t.settingsHomeCurrencyHint}</Text>
      <View style={[s.currenciesWrap, { marginBottom: 20 }]}>
        {(['UAH', ...AVAILABLE_CURRENCIES]).map((code) => {
          const active = homeCurrency === code;
          return (
            <TouchableOpacity
              key={code}
              style={[s.currencyChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
              onPress={() => saveHomeCurrency(code)}
            >
              <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                {currencySymbol(code)} {code}
              </Text>
              {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <GroupLabel label={t.settingsCurrencies} />
      <Text style={[s.hintText, { marginBottom: 10 }]}>{t.settingsCurrenciesHint}</Text>
      <View style={s.currenciesWrap}>
        {(['UAH', ...AVAILABLE_CURRENCIES]).map((code) => {
          const active = prefCurrencies.includes(code);
          return (
            <TouchableOpacity
              key={code}
              style={[s.currencyChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
              onPress={() => toggleCurrency(code)}
            >
              <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                {currencySymbol(code)} {code}
              </Text>
              {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </Section>
  );
}
