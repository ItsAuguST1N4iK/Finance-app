import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator,
  Modal, KeyboardAvoidingView, Animated, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { tokenStore, TOKEN_KEYS } from '../security/tokenStore';
import { useAccountsStore } from '../store/accountsSlice';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useAnalyticsStore } from '../store/analyticsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { THEME_LABELS, ThemeKey, ACCENT_PRESETS, AppTheme } from '../theme';
import { LANGUAGE_LABELS, Language } from '../i18n';
import { useAppAlert } from '../components/AppAlert';
import {
  fetchMonoClientInfo,
  fetchMonoStatement,
  monoStatementToTx,
  SyncProgress,
} from '../api/monobank';
import { parseZenCsv }          from '../api/zen';
import { parseMonobankCsv }     from '../api/monobank-csv';
import { parsePrivatbankXlsx, parsePrivatbankCsv } from '../api/privatbank';
import type { Account, Platform } from '../types';
import { getDatabase } from '../db/migrations';
import { currencySymbol } from '../utils/currency';
import { retagFromRawPayload } from '../utils/tags';


const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK', 'CAD', 'AUD', 'JPY'];

const CARD_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#f97316',
  '#64748b', '#000000', '#1e293b', '#16a34a',
];

// ─── Section Accordion ────────────────────────────────

interface SectionProps {
  title: string;
  icon: string;
  badge?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon, badge, defaultExpanded = false, children }: SectionProps) {
  const { theme }   = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const chevron     = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const bodyOpacity = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  function toggle() {
    const to = expanded ? 0 : 1;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.parallel([
      Animated.spring(chevron,     { toValue: to, useNativeDriver: true, damping: 18, stiffness: 220 }),
      Animated.spring(bodyOpacity, { toValue: to, useNativeDriver: true, damping: 18, stiffness: 220 }),
    ]).start();
    setExpanded((v) => !v);
  }

  const chevRot = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={[secS.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity style={secS.header} onPress={toggle} activeOpacity={0.7}>
        <View style={secS.headerLeft}>
          <View style={[secS.iconWrap, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name={icon as any} size={16} color={theme.accent} />
          </View>
          <Text style={[secS.title, { color: theme.text }]}>{title}</Text>
          {badge && (
            <View style={[secS.badge, { backgroundColor: theme.accent + '33' }]}>
              <Text style={[secS.badgeText, { color: theme.accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevRot }] }}>
          <Ionicons name="chevron-down" size={18} color={theme.subtext} />
        </Animated.View>
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={[secS.body, { borderTopColor: theme.border, opacity: bodyOpacity }]}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

const secS = StyleSheet.create({
  container:  { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap:   { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 15, fontWeight: '600', flex: 1 },
  badge:      { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  body:       { borderTopWidth: 1, padding: 16 },
});

function GroupLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={[grpS.label, { color: theme.subtext }]}>{label}</Text>;
}
const grpS = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
});

// ─── SyncBanner ───────────────────────────────────────

function SyncBanner({ progress }: { progress: SyncProgress | null }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  if (!progress) return null;
  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  return (
    <View style={[bnS.wrap, { backgroundColor: theme.card, borderColor: theme.accent }]}>
      <View style={bnS.row}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[bnS.step, { color: theme.text }]} numberOfLines={1}>{progress.step}</Text>
        <Text style={[bnS.pct, { color: theme.accent }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[bnS.track, { backgroundColor: theme.border }]}>
        <View style={[bnS.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
      </View>
      {progress.total > 1 && (
        <Text style={[bnS.hint, { color: theme.subtext }]}>
          {t.settingsApiRateLimit
            .replace('{current}', String(progress.current))
            .replace('{total}', String(progress.total))}
        </Text>
      )}
    </View>
  );
}

const bnS = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  step: { flex: 1, fontSize: 13 },
  pct:  { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
  hint:  { fontSize: 11, marginTop: 6 },
});

// ─── Token Block ──────────────────────────────────────

function TokenBlock({
  title, hint, tokenKey, instructions, onSaved,
}: {
  title: string; hint: string; tokenKey: string;
  instructions: string; onSaved: () => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { show, element: alertEl } = useAppAlert();
  const [value,     setValue]     = useState('');
  const [saved,     setSaved]     = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);
  const [showInstr, setShowInstr] = useState(false);
  const s = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    tokenStore.get(tokenKey).then((v) => { if (v) setSaved(true); });
  }, [tokenKey]);

  async function handleSave() {
    if (!value.trim()) return;
    await tokenStore.set(tokenKey, value.trim());
    setSaved(true);
    setValue('');
    show(t.tokenSaved, `${title} ${t.tokenSavedHint}`);
    onSaved();
  }

  function handleDelete() {
    show(t.deleteToken, `${title} ${t.deleteTokenConfirm}`, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: async () => {
          await tokenStore.delete(tokenKey);
          setSaved(false);
          setValue('');
        },
      },
    ]);
  }

  return (
    <View style={s.tokenBlock}>
      {alertEl}
      <View style={s.tokenHeader}>
        <Text style={s.tokenTitle}>{title}</Text>
        {saved && (
          <View style={s.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.income} />
            <Text style={[s.savedText, { color: theme.income }]}>{t.connected}</Text>
          </View>
        )}
      </View>
      <Text style={s.tokenHint}>{hint}</Text>
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
      {!saved && (
        <>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder={t.pasteToken}
              placeholderTextColor={theme.subtext}
              value={value}
              onChangeText={setValue}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(!showPwd)} activeOpacity={0.75}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.saveBtn, !value.trim() && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!value.trim()}
            activeOpacity={0.75}
          >
            <Text style={s.saveBtnText}>{t.save}</Text>
          </TouchableOpacity>
        </>
      )}
      {saved && (
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={14} color={theme.expense} />
          <Text style={[s.deleteBtnText, { color: theme.expense }]}>{t.disconnect}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── CSV Import Block ─────────────────────────────────

function CsvImportBlock({
  title, hint, instructions, onImport,
  accounts = [], accountPlatform, requireAccountPick = false,
}: {
  title: string; hint: string; instructions: string;
  accounts?: Account[];
  accountPlatform?: Platform;
  requireAccountPick?: boolean;
  onImport: (uri: string, name: string, accountId: string) => Promise<void>;
}) {
  const { theme }  = useTheme();
  const { t }      = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showInstr, setShowInstr] = useState(false);
  const s = useMemo(() => makeStyles(theme), [theme]);

  const eligibleAccounts = accounts.filter((a) =>
    a.id !== 'acc_default' && (!accountPlatform || a.platform === accountPlatform),
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    eligibleAccounts[0]?.id ?? null,
  );

  useEffect(() => {
    if (eligibleAccounts.length > 0 && !eligibleAccounts.find((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(eligibleAccounts[0].id);
    }
  }, [eligibleAccounts.length, selectedAccountId]);

  async function handlePick() {
    if (requireAccountPick && eligibleAccounts.length === 0) return;
    const accountId = requireAccountPick
      ? selectedAccountId ?? eligibleAccounts[0]?.id
      : eligibleAccounts[0]?.id ?? 'acc_default';
    if (!accountId) return;

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
      await onImport(uri, name ?? '', accountId);
    } catch (e) {
      console.error('[CsvImportBlock]', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[s.tokenBlock, { marginBottom: 12 }]}>
      <Text style={s.tokenTitle}>{title}</Text>
      <Text style={s.tokenHint}>{hint}</Text>

      {requireAccountPick && (
        <>
          <GroupLabel label={t.importCsvSelectAccount} />
          {eligibleAccounts.length === 0 ? (
            <Text style={[s.hintText, { marginBottom: 10 }]}>{t.importCsvNoAccounts}</Text>
          ) : (
            <View style={[s.currenciesWrap, { marginBottom: 12 }]}>
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
        style={[s.saveBtn, (loading || (requireAccountPick && eligibleAccounts.length === 0)) && { opacity: 0.6 }]}
        onPress={handlePick}
        disabled={loading || (requireAccountPick && eligibleAccounts.length === 0)}
        activeOpacity={0.75}
      >
        <Ionicons name="folder-open-outline" size={16} color="#fff" />
        <Text style={s.saveBtnText}>
          {loading ? t.importCsvLoading : t.importCsvBtn}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Platform CSV sub-panel (inside consolidated import section) ──

function PlatformCsvPanel({
  title, children, defaultExpanded = false,
}: {
  title: string; children: React.ReactNode; defaultExpanded?: boolean;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{title}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subtext} />
      </TouchableOpacity>
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12 }}>
          {children}
        </View>
      )}
    </View>
  );
}

// ─── Card Edit Modal ─────────────────────────────────

function SettingsCardEditModal({
  account, visible, onClose, onSave,
}: {
  account: Account; visible: boolean; onClose: () => void;
  onSave: (name: string, color: string) => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const [name,  setName]  = useState(account.displayName ?? account.name);
  const [color, setColor] = useState(account.color ?? '#3b82f6');

  useEffect(() => {
    if (visible) {
      setName(account.displayName ?? account.name);
      setColor(account.color ?? '#3b82f6');
    }
  }, [visible, account]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: theme.border, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{t.dashEditCard}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
                <Ionicons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>
            <View style={{ borderRadius: 14, padding: 16, marginBottom: 16, minHeight: 90, justifyContent: 'space-between', backgroundColor: color }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' }}>{account.platform.toUpperCase()}</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {account.balance != null ? `${account.balance.toLocaleString('uk-UA')} ${currencySymbol(account.currency)} ${account.currency}` : '—'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 }}>{name || account.name}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.dashCardName}</Text>
            <TextInput
              style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 12 }}
              value={name}
              onChangeText={setName}
              placeholder={account.name}
              placeholderTextColor={theme.subtext}
            />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 8 }}>{t.dashCardColor}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {CARD_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[{ width: 32, height: 32, borderRadius: 16, backgroundColor: c },
                    c === color && { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] }]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.75}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 13, alignItems: 'center' }} onPress={onClose} activeOpacity={0.75}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.subtext }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, borderRadius: 10, padding: 13, alignItems: 'center', backgroundColor: theme.accent }}
                onPress={() => { onSave(name.trim() || account.name, color); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────

export function SettingsScreen() {
  const { theme, themeKey, accent, setThemeKey, setAccent } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { accounts, loadAccounts, addAccount, updateBalance, updateDisplay, deactivateAccount } = useAccountsStore();
  const { upsertTransactions } = useTransactionsStore();
  const { loadHomeCurrency } = useAnalyticsStore();
  const { show, element: alertEl } = useAppAlert();

  const [syncing,        setSyncing]        = useState(false);
  const [progress,       setProgress]       = useState<SyncProgress | null>(null);
  const [prefCurrencies, setPrefCurrencies] = useState<string[]>(['USD','EUR','GBP']);
  const [homeCurrency,   setHomeCurrencyState] = useState<string>('UAH');
  const [editAccount,    setEditAccount]    = useState<Account | null>(null);
  const [reTagging,      setReTagging]      = useState(false);

  useEffect(() => {
    loadAccounts();
    try {
      const db  = getDatabase();
      const row = db.getFirstSync<{ preferred_currencies: string | null; home_currency: string | null }>(
        'SELECT preferred_currencies, home_currency FROM settings WHERE id = 1'
      );
      if (row?.preferred_currencies) {
        const parsed = JSON.parse(row.preferred_currencies) as string[];
        if (Array.isArray(parsed)) setPrefCurrencies(parsed);
      }
      if (row?.home_currency) setHomeCurrencyState(row.home_currency);
    } catch {}
  }, []);

  function savePrefCurrencies(updated: string[]) {
    setPrefCurrencies(updated);
    try { getDatabase().runSync('UPDATE settings SET preferred_currencies = ? WHERE id = 1', [JSON.stringify(updated)]); } catch {}
  }

  function toggleCurrency(code: string) {
    const updated = prefCurrencies.includes(code)
      ? prefCurrencies.filter((c) => c !== code)
      : [...prefCurrencies, code];
    savePrefCurrencies(updated);
  }

  function saveHomeCurrency(code: string) {
    setHomeCurrencyState(code);
    try {
      getDatabase().runSync(
        'UPDATE settings SET home_currency = ?, base_currency_exchange = ? WHERE id = 1',
        [code, code]
      );
    } catch {}
    loadHomeCurrency();
  }

  function handleDeactivate(id: string) {
    show(t.deleteAccount, t.txWillRemain, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => deactivateAccount(id) },
    ]);
  }

  function handleResetData() {
    show(t.settingsResetData, t.settingsResetDataConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: () => {
          try {
            const db = getDatabase();
            db.runSync('DELETE FROM transactions');
            show('Готово', 'Всі транзакції видалено.');
          } catch (e) {
            show('Помилка', String((e as Error)?.message ?? e));
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
            const db = getDatabase();
            db.runSync(`UPDATE settings SET
              preferred_currencies = '["USD","EUR","GBP"]',
              base_currency_exchange = 'UAH',
              home_currency = 'UAH'
              WHERE id = 1`);
            // Delete all API tokens
            await tokenStore.delete(TOKEN_KEYS.monobank);
            await tokenStore.delete(TOKEN_KEYS.ibkrFlexToken);
            await tokenStore.delete(TOKEN_KEYS.ibkrQueryId);
            setThemeKey('dark');
            setLanguage('uk');
            setAccent('#10b981');
            setHomeCurrencyState('UAH');
            setPrefCurrencies(['USD','EUR','GBP']);
            show('Готово', 'Налаштування скинуто до заводських.');
          } catch (e) {
            show('Помилка', String((e as Error)?.message ?? e));
          }
        },
      },
    ]);
  }

  async function handleReAutoTag() {
    setReTagging(true);
    try {
      const db = getDatabase();
      const rows = db.getAllSync<{
        id: string; mcc: number | null; description: string | null; raw_payload: string | null;
      }>(`SELECT id, mcc, description, raw_payload FROM transactions WHERE raw_payload IS NOT NULL`);
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);
      let updated = 0;
      db.withTransactionSync(() => {
        for (const row of rows) {
          const tag = row.raw_payload
            ? retagFromRawPayload(row.raw_payload, row.mcc ?? undefined, row.description ?? undefined, ownIbans, accounts)
            : undefined;
          if (tag) {
            db.runSync('UPDATE transactions SET tag = ? WHERE id = ?', [tag, row.id]);
            updated++;
          }
        }
      });
      show('Готово', `Визначено теги для ${updated} транзакцій.`);
    } catch (e) {
      show('Помилка', String((e as Error)?.message ?? e));
    } finally {
      setReTagging(false);
    }
  }

  const syncMonobank = useCallback(async () => {
    const token = await tokenStore.get(TOKEN_KEYS.monobank);
    if (!token) { show('Токен відсутній', 'Спочатку збережіть Monobank X-Token.'); return; }

    setSyncing(true);
    setProgress({ step: 'Підключення до Monobank…', current: 0, total: 1 });

    try {
      const { accounts: monoAccounts } = await fetchMonoClientInfo(token);
      const ownIbans = [
        ...monoAccounts.map((ma) => ma.raw.iban).filter(Boolean) as string[],
        ...accounts.filter((a) => a.iban).map((a) => a.iban!),
      ];

      const nowSec  = Math.floor(Date.now() / 1000);
      const fromSec = nowSec - 90 * 24 * 60 * 60;
      const MAX_WIN = 30 * 24 * 60 * 60;
      const windows: Array<{ from: number; to: number }> = [];
      for (let ts = fromSec; ts < nowSec; ts += MAX_WIN) {
        windows.push({ from: ts, to: Math.min(ts + MAX_WIN, nowSec) });
      }
      const total = monoAccounts.length * windows.length;
      let done = 0;

      for (const { raw, account } of monoAccounts) {
        const existingAcc = accounts.find((a) => a.externalId === raw.id);
        let internalId = existingAcc?.id;
        if (!existingAcc) {
          addAccount(account);
          loadAccounts();
          const updated = useAccountsStore.getState().accounts;
          internalId = updated.find((a) => a.externalId === raw.id)?.id;
        } else {
          updateBalance(existingAcc.id, account.balance ?? 0);
        }
        if (!internalId) continue;

        for (const win of windows) {
          done++;
          setProgress({
            step:    `${account.name} · ${new Date(win.from * 1000).toLocaleDateString('uk-UA')}`,
            current: done, total,
          });

          let retryWindow = false;
          do {
            retryWindow = false;
            try {
              const stmts = await fetchMonoStatement(token, raw.id, win.from, win.to);
            const txs   = stmts.map((s) => monoStatementToTx(s, internalId!, ownIbans, accounts));
            if (txs.length > 0) upsertTransactions(txs);
            } catch (e: unknown) {
              if ((e as Error)?.message === 'rate_limit') {
                setProgress({ step: 'Ліміт API — чекаємо 65 с…', current: done, total });
                await new Promise((r) => setTimeout(r, 65_000));
                retryWindow = true;
                setProgress({
                  step:    `${account.name} · ${new Date(win.from * 1000).toLocaleDateString('uk-UA')}`,
                  current: done, total,
                });
              } else {
                console.warn('[mono sync]', e);
              }
            }
          } while (retryWindow);

          if (done < total) {
            setProgress({ step: 'Пауза між запитами…', current: done, total });
            await new Promise((r) => setTimeout(r, 62_000));
          }
        }
      }
      setProgress({ step: 'Синхронізацію завершено!', current: total, total });
      show('Готово', 'Транзакції з Monobank успішно завантажено.');
    } catch (e: unknown) {
      show('Помилка синхронізації', String((e as Error)?.message ?? e));
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(null), 3000);
      loadAccounts();
    }
  }, [accounts]);

  // ─── CSV Import handlers ─────────────────────────

  function showImportResult(label: string, result: { inserted: number; skipped: number }) {
    if (result.inserted > 0) {
      let msg = t.importCsvSuccess.replace('{count}', String(result.inserted));
      if (result.skipped > 0) {
        msg += `\n${t.importCsvSkipped.replace('{count}', String(result.skipped))}`;
      }
      show(`${label}: Імпортовано`, msg);
    } else if (result.skipped > 0) {
      show(label, t.importCsvSkipped.replace('{count}', String(result.skipped)));
    } else {
      show(label, 'Не знайдено транзакцій у файлі.');
    }
  }

  async function handleZenImport(uri: string, _name: string, accountId: string) {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);

      const { transactions } = parseZenCsv(content, accountId, ownIbans, accounts);
      if (transactions.length > 0) {
        const result = upsertTransactions(transactions);
        showImportResult('ZEN', result);
      } else {
        show('ZEN', 'Не знайдено транзакцій у файлі.');
      }
    } catch (e) {
      show(t.importCsvError, String((e as Error)?.message ?? e));
    }
  }

  async function handleMonoCsvImport(uri: string, _name: string, accountId: string) {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);

      const { transactions } = parseMonobankCsv(content, accountId, ownIbans, accounts);
      if (transactions.length > 0) {
        const result = upsertTransactions(transactions);
        showImportResult('Monobank CSV', result);
      } else {
        show('Monobank CSV', 'Не знайдено транзакцій у файлі.');
      }
    } catch (e) {
      show(t.importCsvError, String((e as Error)?.message ?? e));
    }
  }

  async function handlePrivatImport(uri: string, name: string, accountId: string) {
    try {
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);

      const isXlsx = name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls');
      let transactions: ReturnType<typeof parsePrivatbankCsv>['transactions'] = [];

      if (isXlsx) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        transactions = parsePrivatbankXlsx(bytes.buffer, accountId, ownIbans, accounts).transactions;
      } else {
        const content = await FileSystem.readAsStringAsync(uri);
        transactions = parsePrivatbankCsv(content, accountId, ownIbans, accounts).transactions;
      }

      if (transactions.length > 0) {
        const result = upsertTransactions(transactions);
        showImportResult('PrivatBank', result);
      } else {
        show('PrivatBank', 'Не знайдено транзакцій у файлі.');
      }
    } catch (e) {
      show(t.importCsvError, String((e as Error)?.message ?? e));
    }
  }

  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {alertEl}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ─── 1. App Appearance ── */}
        <Section title={t.settingsAppearance} icon="color-palette-outline" defaultExpanded>
          <GroupLabel label={t.settingsTheme} />
          <View style={[s.themeRow, { marginBottom: 16 }]}>
            {(['dark', 'cursor', 'oled', 'light'] as ThemeKey[]).map((key) => {
              const colors: Record<ThemeKey, string> = {
                dark: '#0f172a', cursor: '#1e1e1e', oled: '#000000', light: '#f8fafc',
              };
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.themeBtn, themeKey === key && { borderColor: theme.accent }]}
                  onPress={() => setThemeKey(key)}
                >
                  <View style={[s.themeDot, { backgroundColor: colors[key], borderWidth: key === 'light' ? 1 : 0, borderColor: theme.border }]} />
                  <Text style={[s.themeBtnLabel, themeKey === key && { color: theme.accent }]}>{THEME_LABELS[key]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <GroupLabel label={t.settingsAccentColor} />
          <View style={[s.accentRow, { marginBottom: 4 }]}>
            {ACCENT_PRESETS.map((c) => (
              <TouchableOpacity key={c} style={[s.accentDot, { backgroundColor: c }, accent === c && s.accentDotActive]} onPress={() => setAccent(c)} />
            ))}
          </View>
        </Section>

        {/* ─── 2. User Preferences ── */}
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
            {AVAILABLE_CURRENCIES.map((code) => {
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

        {/* ─── 3. Monobank API ── */}
        <Section title="Monobank" icon="card-outline" badge="API">
          {/* API limit note */}
          <View style={[s.noteBox, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '44', marginBottom: 12 }]}>
            <Ionicons name="information-circle-outline" size={14} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[s.noteTitle, { color: theme.warning }]}>{t.settingsMonobankLimit}</Text>
              <Text style={[s.noteText, { color: theme.subtext }]}>{t.settingsMonobankLimitHint}</Text>
            </View>
          </View>

          {/* API sync */}
          <GroupLabel label="API — автосинхронізація (90 днів)" />
          <TouchableOpacity
            style={[s.syncBtn, syncing && { opacity: 0.6 }]}
            onPress={syncMonobank}
            disabled={syncing}
          >
            <Ionicons name="sync-outline" size={18} color="#fff" />
            <Text style={s.syncBtnText}>{syncing ? t.settingsSyncing : t.settingsSyncMono}</Text>
          </TouchableOpacity>
          <SyncBanner progress={syncing ? progress : null} />
          <TokenBlock
            title="Monobank X-Token"
            hint="api.monobank.ua → «Для розробників» → Скопіювати токен"
            tokenKey={TOKEN_KEYS.monobank}
            instructions={t.settingsMonobankInstructions}
            onSaved={syncMonobank}
          />
        </Section>

        {/* ─── 4. CSV Import (all platforms) ── */}
        <Section title={t.importCsvSectionTitle} icon="document-text-outline" badge="CSV">
          <PlatformCsvPanel title="Monobank" defaultExpanded>
            <CsvImportBlock
              title="Monobank CSV"
              hint="Monobank app → ••• → Виписка → Завантажити CSV"
              instructions={'1. Відкрий додаток Monobank\n2. На головному екрані натисни "···" (три крапки)\n3. Перейди: Виписка → Завантажити (.csv)\n4. Відправ файл на цей пристрій\n5. Обери картку нижче та натисни "Імпортувати файл"\n\n✅ CSV містить всю доступну історію без обмежень!'}
              accounts={accounts}
              accountPlatform="monobank"
              requireAccountPick
              onImport={handleMonoCsvImport}
            />
          </PlatformCsvPanel>

          <PlatformCsvPanel title="ZEN Money">
            <CsvImportBlock
              title={t.settingsZen}
              hint={t.settingsZenHint}
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
              hint={t.settingsPrivatbankHint}
              instructions={t.settingsPrivatbankInstructions}
              accounts={accounts}
              accountPlatform="privatbank"
              requireAccountPick
              onImport={handlePrivatImport}
            />
          </PlatformCsvPanel>
        </Section>

        {/* ─── 5. IBKR ── */}
        <Section title="Interactive Brokers (IBKR)" icon="trending-up-outline" badge="API">
          <View style={[s.noteBox, { backgroundColor: theme.accent + '11', borderColor: theme.accent + '33', marginBottom: 12 }]}>
            <Ionicons name="information-circle-outline" size={14} color={theme.accent} />
            <Text style={[s.noteText, { color: theme.subtext, flex: 1 }]}>
              {'IBKR використовує Flex Web Service. Потрібен Flex Token та Query ID.\nПідтримка: активна торгова активність, готівкові транзакції.'}
            </Text>
          </View>
          <TokenBlock
            title="IBKR Flex Token"
            hint="Client Portal → Performance & Reports → Flex Queries → Manage Flex Tokens"
            tokenKey={TOKEN_KEYS.ibkrFlexToken}
            instructions={t.settingsIbkrTokenInstructions}
            onSaved={loadAccounts}
          />
          <TokenBlock
            title="IBKR Query ID"
            hint="ID Activity Flex Query (число, наприклад: 1234567)"
            tokenKey={TOKEN_KEYS.ibkrQueryId}
            instructions={t.settingsIbkrQueryInstructions}
            onSaved={loadAccounts}
          />
        </Section>

        {/* ─── 7. Tags ── */}
        <Section title={t.tagLabel} icon="pricetag-outline">
          <Text style={[s.hintText, { marginBottom: 12 }]}>{t.settingsReAutoTagHint}</Text>
          <TouchableOpacity
            style={[s.syncBtn, reTagging && { opacity: 0.6 }]}
            onPress={handleReAutoTag}
            disabled={reTagging}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={s.syncBtnText}>{reTagging ? 'Визначаємо теги…' : t.settingsReAutoTag}</Text>
          </TouchableOpacity>
        </Section>

        {/* ─── 8. Card Settings ── */}
        <Section title={t.settingsCards} icon="card-outline">
          {accounts.filter((a) => a.id !== 'acc_default').length === 0 ? (
            <View style={s.emptyAccounts}>
              <Ionicons name="card-outline" size={28} color={theme.border} />
              <Text style={s.emptyAccountsText}>{t.settingsNoAccounts}</Text>
            </View>
          ) : (
            accounts.filter((a) => a.id !== 'acc_default').map((a) => (
              <View key={a.id} style={s.accountRow}>
                <View style={[s.accountColorDot, { backgroundColor: a.color ?? theme.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.accountName}>{a.displayName ?? a.name}</Text>
                  <Text style={s.accountMeta}>{a.platform.toUpperCase()} · {currencySymbol(a.currency)} {a.currency}</Text>
                </View>
                <View style={s.accountRight}>
                  {a.balance != null && (
                    <Text style={s.accountBalance}>
                      {a.balance.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} {currencySymbol(a.currency)} {a.currency}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setEditAccount(a)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Ionicons name="pencil-outline" size={17} color={theme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeactivate(a.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Ionicons name="trash-outline" size={17} color={theme.expense} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* ─── 9. Danger Zone ── */}
        <Section title={t.settingsDanger} icon="warning-outline">
          <View style={{ gap: 10 }}>
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

        <View style={s.aboutSection}>
          <Text style={s.aboutTitle}>{t.settingsAbout}</Text>
          <Text style={s.aboutText}>{t.settingsAboutLocal}</Text>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>

      {editAccount && (
        <SettingsCardEditModal
          account={editAccount}
          visible={!!editAccount}
          onClose={() => setEditAccount(null)}
          onSave={(name, color) => { updateDisplay(editAccount.id, name, color); setEditAccount(null); }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    hintText:  { color: t.subtext, fontSize: 13, lineHeight: 18 },

    themeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    themeBtn:      { width: '48%', height: 80, alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: t.cardAlt, borderRadius: 12, borderWidth: 2, borderColor: t.border, gap: 6 },
    themeDot:      { width: 26, height: 26, borderRadius: 13 },
    themeBtnLabel: { color: t.subtext, fontSize: 10, fontWeight: '600', textAlign: 'center' },
    accentRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    accentDot:     { width: 34, height: 34, borderRadius: 17 },
    accentDotActive: { borderWidth: 3, borderColor: '#fff' },

    langRow:    { flexDirection: 'row', gap: 10 },
    langBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.cardAlt },
    langBtnText: { fontSize: 14, fontWeight: '600' },

    currenciesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    currencyChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
    currencyChipText: { fontSize: 13, fontWeight: '600' },

    noteBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
    noteTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
    noteText:  { fontSize: 12, lineHeight: 16 },

    syncBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.accent, borderRadius: 10, padding: 12, marginBottom: 12, justifyContent: 'center' },
    syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    tokenBlock:  { backgroundColor: t.cardAlt, borderRadius: 12, padding: 14, marginBottom: 10 },
    tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    tokenTitle:  { color: t.text, fontSize: 14, fontWeight: '600' },
    savedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    savedText:   { fontSize: 12 },
    tokenHint:   { color: t.subtext, fontSize: 12, marginBottom: 10 },
    inputRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
    input:       { backgroundColor: t.inputBg, borderRadius: 8, padding: 12, color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.border },
    eyeBtn:      { backgroundColor: t.inputBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: t.border },
    saveBtn:     { backgroundColor: t.accent, borderRadius: 8, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    deleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    deleteBtnText: { fontSize: 13 },
    instrToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 4 },
    instrToggleText: { fontSize: 12, fontWeight: '600' },
    instrBox:    { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 8 },
    instrText:   { fontSize: 12, lineHeight: 18 },

    accountRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.bg, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
    accountColorDot:  { width: 10, height: 10, borderRadius: 5 },
    accountName:      { color: t.text, fontSize: 14, fontWeight: '600' },
    accountMeta:      { color: t.subtext, fontSize: 12, marginTop: 2 },
    accountRight:     { alignItems: 'flex-end', gap: 8 },
    accountBalance:   { color: t.text, fontSize: 13 },
    emptyAccounts:    { alignItems: 'center', padding: 20, gap: 8 },
    emptyAccountsText: { color: t.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    dangerBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
    dangerTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    dangerHint:  { fontSize: 12 },
    dangerBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
    dangerBtnText: { fontSize: 13, fontWeight: '600' },

    aboutSection: { marginTop: 24, alignItems: 'center', paddingBottom: 20 },
    aboutTitle:   { color: t.subtext, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    aboutText:    { color: t.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  });
}
