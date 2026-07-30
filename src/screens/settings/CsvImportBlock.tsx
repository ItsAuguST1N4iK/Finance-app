import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Account, Platform } from '../../types';
import type { MonoCsvCurrencyMode } from '../../api/monobank-csv';
import { GroupLabel } from './Section';
import { makeStyles } from './settingsStyles';

const AUTO_ACCOUNT = '__auto__';

export function CsvImportBlock({
  title, instructions, onImport,
  accounts = [], accountPlatform, requireAccountPick = false,
  showCurrencyMode = false,
}: {
  title: string; instructions: string;
  accounts?: Account[];
  accountPlatform?: Platform;
  requireAccountPick?: boolean;
  showCurrencyMode?: boolean;
  onImport: (
    uri: string,
    name: string,
    accountId: string,
    options?: { currencyMode: MonoCsvCurrencyMode },
  ) => void | Promise<void>;
}) {
  const { theme }  = useTheme();
  const { t }      = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showInstr, setShowInstr] = useState(false);
  const [currencyMode, setCurrencyMode] = useState<MonoCsvCurrencyMode>('auto');
  const s = useMemo(() => makeStyles(theme), [theme]);

  const eligibleAccounts = accounts.filter((a) =>
    a.id !== 'acc_default' && (!accountPlatform || a.platform === accountPlatform),
  );

  // Prefer Auto account creation / currency detection by default
  const [selectedAccountId, setSelectedAccountId] = useState<string>(AUTO_ACCOUNT);

  useEffect(() => {
    if (selectedAccountId === AUTO_ACCOUNT) return;
    if (!eligibleAccounts.find((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(eligibleAccounts[0]?.id ?? AUTO_ACCOUNT);
    }
  }, [eligibleAccounts.length, selectedAccountId]);

  async function handlePick() {
    const accountId = selectedAccountId === AUTO_ACCOUNT
      ? ''
      : (selectedAccountId || eligibleAccounts[0]?.id || '');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const { uri, name } = result.assets[0];
      setLoading(true);
      await onImport(uri, name ?? '', accountId, showCurrencyMode ? { currencyMode } : undefined);
    } catch (e) {
      console.error('[CsvImportBlock]', e);
    } finally {
      setLoading(false);
    }
  }

  const selectedCurrency = eligibleAccounts.find((a) => a.id === selectedAccountId)?.currency;

  return (
    <View style={[s.tokenBlock, { marginBottom: 12 }]}>
      <Text style={s.tokenTitle}>{title}</Text>

      {requireAccountPick && (
        <>
          <GroupLabel label={t.importCsvSelectAccount} />
          {eligibleAccounts.length === 0 ? (
            <Text style={[s.hintText, { marginBottom: 10 }]}>{t.importCsvAutoCreateHint}</Text>
          ) : (
            <View style={[s.currenciesWrap, { marginBottom: 12 }]}>
              <TouchableOpacity
                style={[s.currencyChip, {
                  backgroundColor: selectedAccountId === AUTO_ACCOUNT ? theme.accent + '22' : theme.cardAlt,
                  borderColor: selectedAccountId === AUTO_ACCOUNT ? theme.accent : theme.border,
                }]}
                onPress={() => setSelectedAccountId(AUTO_ACCOUNT)}
                activeOpacity={0.75}
              >
                <Text style={[s.currencyChipText, {
                  color: selectedAccountId === AUTO_ACCOUNT ? theme.accent : theme.subtext,
                }]}>
                  {t.importCsvAutoCreate}
                </Text>
                {selectedAccountId === AUTO_ACCOUNT && (
                  <Ionicons name="checkmark" size={12} color={theme.accent} />
                )}
              </TouchableOpacity>
              {eligibleAccounts.map((acc) => {
                const active = selectedAccountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[s.currencyChip, {
                      backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                      borderColor: active ? theme.accent : theme.border,
                    }]}
                    onPress={() => setSelectedAccountId(acc.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                      {acc.displayName ?? acc.name}
                    </Text>
                    {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {showCurrencyMode && (
        <>
          <GroupLabel label={t.importCurrencyLabel} />
          <View style={[s.currenciesWrap, { marginBottom: 12 }]}>
            {([
              { mode: 'auto' as const, label: t.importCurrencyAuto },
              {
                mode: 'account' as const,
                label: t.importCurrencyAccount.replace(
                  '{currency}',
                  selectedCurrency ?? 'UAH',
                ),
              },
              { mode: 'operation' as const, label: t.importCurrencyOperation },
            ]).map(({ mode, label }) => {
              const active = currencyMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[s.currencyChip, {
                    backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                    borderColor: active ? theme.accent : theme.border,
                  }]}
                  onPress={() => setCurrencyMode(mode)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                    {label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <TouchableOpacity style={s.instrToggle} onPress={() => setShowInstr((v) => !v)} activeOpacity={0.75}>
        <Ionicons name={showInstr ? 'chevron-up' : 'information-circle-outline'} size={14} color={theme.accent} />
        <Text style={[s.instrToggleText, { color: theme.accent }]}>
          {showInstr ? t.cancel : t.settingsHowToGet}
        </Text>
      </TouchableOpacity>
      {showInstr && (
        <View style={[s.instrBox, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[s.instrText, { color: theme.subtext }]}>{instructions}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[s.saveBtn, loading && { opacity: 0.6 }]}
        onPress={handlePick}
        disabled={loading}
        activeOpacity={0.75}
      >
        <Ionicons name="folder-open-outline" size={16} color={theme.onAccent} />
        <Text style={s.saveBtnText}>
          {loading ? t.importCsvLoading : t.importCsvBtn}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
