import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANGUAGE_LABELS, Language } from '../../i18n';
import { currencySymbol } from '../../utils/currency';
import { AVAILABLE_CURRENCIES } from '../../constants/currencies';
import { savePreferredCurrencies, saveHomeCurrency as persistHomeCurrency } from '../../utils/settingsPrefs';
import {
  loadBiometricEnabled,
  saveBiometricEnabled,
} from '../../security/biometricPrefs';
import { refreshAppData } from '../../services/refreshAppData';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedSwitch } from '../../components/AnimatedSwitch';
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
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    void (async () => {
      const [on, hw, enrolled] = await Promise.all([
        loadBiometricEnabled(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBiometricOn(on);
      setBiometricAvailable(hw && enrolled);
    })();
  }, []);

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

  async function onToggleBiometric(next: boolean) {
    if (next) {
      if (!biometricAvailable) {
        Alert.alert(t.biometricUnavailableTitle, t.biometricUnavailableBody);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.biometricEnablePrompt,
        cancelLabel: t.cancel,
        disableDeviceFallback: false,
        fallbackLabel: t.biometricFallback,
      });
      if (!result.success) return;
    }
    setBiometricOn(next);
    try {
      await saveBiometricEnabled(next);
    } catch {
      setBiometricOn(!next);
      Alert.alert(t.error, t.biometricSaveFailed);
    }
  }

  return (
    <Section title={t.settingsUserPreferences} icon="person-circle-outline">
      <GroupLabel label={t.settingsLanguage} />
      <View style={[s.langRow, { marginBottom: 20 }]}>
        {(['uk', 'en'] as Language[]).map((lang) => (
          <PressableScale
            key={lang}
            style={[s.langBtn, language === lang && { borderColor: theme.accent, backgroundColor: theme.accent + '18' }]}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onPress={() => setLanguage(lang)}
            scaleTo={0.96}
          >
            <Text style={[s.langBtnText, { color: language === lang ? theme.accent : theme.subtext }]}>
              {LANGUAGE_LABELS[lang]}
            </Text>
            {language === lang && <Ionicons name="checkmark" size={14} color={theme.accent} />}
          </PressableScale>
        ))}
      </View>

      <GroupLabel label={t.settingsBiometric} />
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
            {t.settingsBiometricLock}
          </Text>
          <Text style={[s.hintText, { marginTop: 4 }]}>{t.settingsBiometricHint}</Text>
        </View>
        <AnimatedSwitch
          value={biometricOn}
          onValueChange={(v) => { void onToggleBiometric(v); }}
          disabled={!biometricAvailable && !biometricOn}
        />
      </View>

      <GroupLabel label={t.settingsHomeCurrency} />
      <Text style={[s.hintText, { marginBottom: 10 }]}>{t.settingsHomeCurrencyHint}</Text>
      <View style={[s.currenciesWrap, { marginBottom: 20 }]}>
        {(['UAH', ...AVAILABLE_CURRENCIES]).map((code) => {
          const active = homeCurrency === code;
          return (
            <PressableScale
              key={code}
              style={[s.currencyChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => saveHomeCurrency(code)}
              scaleTo={0.94}
            >
              <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                {currencySymbol(code)} {code}
              </Text>
              {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
            </PressableScale>
          );
        })}
      </View>

      <GroupLabel label={t.settingsCurrencies} />
      <Text style={[s.hintText, { marginBottom: 10 }]}>{t.settingsCurrenciesHint}</Text>
      <View style={s.currenciesWrap}>
        {(['UAH', ...AVAILABLE_CURRENCIES]).map((code) => {
          const active = prefCurrencies.includes(code);
          return (
            <PressableScale
              key={code}
              style={[s.currencyChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => toggleCurrency(code)}
              scaleTo={0.94}
            >
              <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                {currencySymbol(code)} {code}
              </Text>
              {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
            </PressableScale>
          );
        })}
      </View>
    </Section>
  );
}
