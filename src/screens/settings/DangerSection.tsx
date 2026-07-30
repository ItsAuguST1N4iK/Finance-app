import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { resetAllFinancialData, resetAppSettings } from '../../utils/resetAppData';
import { exportAndShareFullData } from '../../utils/exportFullData';
import { refreshAppData } from '../../services/refreshAppData';
import type { AlertShow } from '../../utils/importTransactions';
import { Section } from './Section';
import type { SettingsStyles } from './settingsStyles';

export function DangerSection({
  s,
  loadAccounts,
  setHomeCurrencyState,
  setPrefCurrencies,
  show,
}: {
  s: SettingsStyles;
  loadAccounts: () => void;
  setHomeCurrencyState: (v: string) => void;
  setPrefCurrencies: (v: string[]) => void;
  show: AlertShow;
}) {
  const { theme, setThemeKey, setAccent } = useTheme();
  const { setLanguage, t } = useLanguage();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { txCount } = await exportAndShareFullData();
      show(
        t.done,
        t.settingsExportSuccess.replace('{count}', String(txCount)),
      );
    } catch (e) {
      show(t.error, String((e as Error)?.message ?? e));
    } finally {
      setExporting(false);
    }
  }

  function handleResetData() {
    show(t.settingsResetData, t.settingsResetDataConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: async () => {
          try {
            resetAllFinancialData();
            await refreshAppData('all');
            loadAccounts();
            show(t.done, t.settingsDataDeleted);
          } catch (e) {
            show(t.error, String((e as Error)?.message ?? e));
          }
        },
      },
    ]);
  }

  function handleResetSettings() {
    show(t.settingsResetSettings, t.settingsResetSettingsConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: async () => {
          try {
            await resetAppSettings();
            setThemeKey('dark');
            setLanguage('uk');
            setAccent('#10b981');
            setHomeCurrencyState('UAH');
            setPrefCurrencies(['USD', 'EUR', 'GBP']);
            await refreshAppData('all');
            show(t.done, t.settingsResetDone);
          } catch (e) {
            show(t.error, String((e as Error)?.message ?? e));
          }
        },
      },
    ]);
  }

  return (
    <Section title={t.settingsDanger} icon="warning-outline">
      <View style={{ gap: 10 }}>
        <View style={[s.dangerBlock, { borderColor: theme.accent + '55' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.dangerTitle, { color: theme.text }]}>{t.settingsExport}</Text>
            <Text style={[s.dangerHint, { color: theme.subtext }]}>{t.settingsExportHint}</Text>
          </View>
          <TouchableOpacity
            style={[s.dangerBtn, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '55' }, exporting && { opacity: 0.6 }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.75}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Ionicons name="share-outline" size={16} color={theme.accent} />
            )}
            <Text style={[s.dangerBtnText, { color: theme.accent }]}>
              {exporting ? t.settingsExporting : t.settingsExportBtn}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[s.dangerBlock, { borderColor: theme.expense + '55' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.dangerTitle, { color: theme.text }]}>{t.settingsResetData}</Text>
            <Text style={[s.dangerHint, { color: theme.subtext }]}>{t.settingsResetDataHint}</Text>
          </View>
          <TouchableOpacity
            style={[s.dangerBtn, { backgroundColor: theme.expense + '22', borderColor: theme.expense + '55' }]}
            onPress={handleResetData}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={16} color={theme.expense} />
            <Text style={[s.dangerBtnText, { color: theme.expense }]}>{t.settingsResetData}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.dangerBlock, { borderColor: theme.warning + '55' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.dangerTitle, { color: theme.text }]}>{t.settingsResetSettings}</Text>
            <Text style={[s.dangerHint, { color: theme.subtext }]}>{t.settingsResetSettingsHint}</Text>
          </View>
          <TouchableOpacity
            style={[s.dangerBtn, { backgroundColor: theme.warning + '22', borderColor: theme.warning + '55' }]}
            onPress={handleResetSettings}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.warning} />
            <Text style={[s.dangerBtnText, { color: theme.warning }]}>{t.settingsResetSettings}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Section>
  );
}
