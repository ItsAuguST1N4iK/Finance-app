import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { TOKEN_KEYS } from '../../security/tokenStore';
import type { Account } from '../../types';
import type { MonoCsvCurrencyMode } from '../../api/monobank-csv';
import type { SyncProgress } from '../../api/monobank';
import { Section, GroupLabel } from './Section';
import { TokenBlock } from './TokenBlock';
import { CsvImportBlock } from './CsvImportBlock';
import { PlatformCsvPanel } from './PlatformCsvPanel';
import type { SettingsStyles } from './settingsStyles';

export function PlatformsSection({
  s,
  accounts,
  syncing,
  progress: _progress,
  syncMonobank,
  syncIBKR,
  loadAccounts,
  handleZenImport,
  handleMonoCsvImport,
  handlePrivatImport,
  handleIbkrCsvImport,
}: {
  s: SettingsStyles;
  accounts: Account[];
  syncing: boolean;
  progress: SyncProgress | null;
  syncMonobank: () => void;
  syncIBKR: () => void;
  loadAccounts: () => void;
  handleZenImport: (uri: string, name: string, accountId: string) => void | Promise<void>;
  handleMonoCsvImport: (
    uri: string,
    name: string,
    accountId: string,
    options?: { currencyMode: MonoCsvCurrencyMode },
  ) => void | Promise<void>;
  handlePrivatImport: (uri: string, name: string, accountId: string) => void | Promise<void>;
  handleIbkrCsvImport: (uri: string, name: string, accountId: string) => void | Promise<void>;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Section title={t.settingsPlatforms} icon="link-outline">
      <Text style={[s.hintText, { marginBottom: 14 }]}>{t.settingsPlatformsHint}</Text>

      <PlatformCsvPanel title="Monobank">
        <View style={[s.noteBox, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '44', marginBottom: 12 }]}>
          <Ionicons name="information-circle-outline" size={14} color={theme.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[s.noteTitle, { color: theme.warning }]}>{t.settingsMonobankLimit}</Text>
            <Text style={[s.noteText, { color: theme.subtext }]}>{t.settingsMonobankLimitHint}</Text>
          </View>
        </View>
        <GroupLabel label={t.settingsMonoApiSync} />
        <TouchableOpacity
          style={[s.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={syncMonobank}
          disabled={syncing}
        >
          <Ionicons name="sync-outline" size={18} color={theme.onAccent} />
          <Text style={s.syncBtnText}>{syncing ? t.settingsSyncing : t.settingsSyncMono}</Text>
        </TouchableOpacity>
        <TokenBlock
          title="Monobank X-Token"
          tokenKey={TOKEN_KEYS.monobank}
          instructions={t.settingsMonobankInstructions}
          onSaved={syncMonobank}
        />
        <GroupLabel label={t.settingsCsvImportLabel} />
        <CsvImportBlock
          title="Monobank CSV"
          instructions={t.settingsMonoCsvInstructions}
          accounts={accounts}
          accountPlatform="monobank"
          requireAccountPick
          showCurrencyMode
          onImport={handleMonoCsvImport}
        />
      </PlatformCsvPanel>

      <PlatformCsvPanel title="ZEN Money">
        <CsvImportBlock
          title={t.settingsZen}
          instructions={t.settingsZenInstructions}
          accounts={accounts}
          accountPlatform="zen"
          requireAccountPick
          onImport={handleZenImport}
        />
      </PlatformCsvPanel>

      <PlatformCsvPanel title="PrivatBank">
        <CsvImportBlock
          title={t.settingsPrivatbank}
          instructions={t.settingsPrivatbankInstructions}
          accounts={accounts}
          accountPlatform="privatbank"
          requireAccountPick
          onImport={handlePrivatImport}
        />
      </PlatformCsvPanel>

      <PlatformCsvPanel title="Interactive Brokers (IBKR)">
        <View style={[s.noteBox, { backgroundColor: theme.accent + '11', borderColor: theme.accent + '33', marginBottom: 12 }]}>
          <Ionicons name="information-circle-outline" size={14} color={theme.accent} />
          <Text style={[s.noteText, { color: theme.subtext, flex: 1 }]}>
            {'IBKR використовує Flex Web Service. Потрібен Flex Token та Query ID.\nПідтримка: активна торгова активність, готівкові транзакції.'}
          </Text>
        </View>
        <GroupLabel label="Flex Web Service" />
        <TouchableOpacity
          style={[s.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={syncIBKR}
          disabled={syncing}
        >
          <Ionicons name="sync-outline" size={18} color={theme.onAccent} />
          <Text style={s.syncBtnText}>{syncing ? t.settingsSyncing : t.settingsSyncIbkr}</Text>
        </TouchableOpacity>
        <TokenBlock
          title="IBKR Flex Token"
          tokenKey={TOKEN_KEYS.ibkrFlexToken}
          instructions={t.settingsIbkrTokenInstructions}
          onSaved={loadAccounts}
        />
        <TokenBlock
          title="IBKR Query ID"
          tokenKey={TOKEN_KEYS.ibkrQueryId}
          instructions={t.settingsIbkrQueryInstructions}
          onSaved={loadAccounts}
        />
        <GroupLabel label={t.settingsCsvImportLabel} />
        <CsvImportBlock
          title="IBKR Trade History CSV"
          instructions={t.settingsIbkrCsvInstructions}
          accounts={accounts}
          accountPlatform="ibkr"
          requireAccountPick
          onImport={handleIbkrCsvImport}
        />
      </PlatformCsvPanel>
    </Section>
  );
}
