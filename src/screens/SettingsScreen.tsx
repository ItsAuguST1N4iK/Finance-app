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
import { parseMonobankCsv, type MonoCsvCurrencyMode } from '../api/monobank-csv';
import { parsePrivatbankXlsx, parsePrivatbankCsv } from '../api/privatbank';
import type { Account, Platform, UnifiedTransaction } from '../types';
import { getDatabase } from '../db/migrations';
import { refreshAppData } from '../utils/refreshAppData';
import { analyzeImportDuplicates, reassignTransactionId } from '../utils/importTransactions';
import { CardPreview } from '../components/CardPreview';
import { SettingSlider } from '../components/SettingSlider';
import { currencySymbol } from '../utils/currency';
import { retagFromRawPayload } from '../utils/tags';
import { autoDetectCategoryKey } from '../utils/categories';
import { seedDefaultCategoryRules, loadCategoryRules, saveCategoryRule, deleteCategoryRule, buildRuleDisplayName } from '../utils/categoryRules';
import type { CategoryRule, RuleMatchField, RuleMatchOp } from '../utils/categoryRules';
import type { CategoryKey } from '../utils/categoryRegistry';
import { ALL_CATEGORY_KEYS } from '../utils/categoryRegistry';
import { useCategoryLabels } from '../hooks/useCategoryLabels';


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
  const { theme, dur, cardSurface } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyOpacity = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const surface = cardSurface();

  function toggle() {
    const to = expanded ? 0 : 1;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(bodyOpacity, {
      toValue: to,
      duration: dur(220),
      useNativeDriver: true,
    }).start();
    setExpanded((v) => !v);
  }

  return (
    <View style={[secS.container, surface, { borderColor: theme.border }]}>
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
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subtext} />
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
  title, tokenKey, instructions, onSaved,
}: {
  title: string; tokenKey: string;
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
  ) => Promise<void>;
}) {
  const { theme }  = useTheme();
  const { t }      = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showInstr, setShowInstr] = useState(false);
  const [currencyMode, setCurrencyMode] = useState<MonoCsvCurrencyMode>('account');
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
      await onImport(uri, name ?? '', accountId, showCurrencyMode ? { currencyMode } : undefined);
    } catch (e) {
      console.error('[CsvImportBlock]', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[s.tokenBlock, { marginBottom: 12 }]}>
      <Text style={s.tokenTitle}>{title}</Text>

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

      {showCurrencyMode && (
        <>
          <GroupLabel label={t.importCurrencyLabel} />
          <View style={[s.currenciesWrap, { marginBottom: 12 }]}>
            {([
              { mode: 'account' as const, label: t.importCurrencyAccount.replace('{currency}', eligibleAccounts.find((a) => a.id === selectedAccountId)?.currency ?? '—') },
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
  const { theme, dur, cardSurface } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyOpacity = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const surface = cardSurface(true);

  function toggle() {
    const to = expanded ? 0 : 1;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(bodyOpacity, {
      toValue: to,
      duration: dur(220),
      useNativeDriver: true,
    }).start();
    setExpanded((v) => !v);
  }

  return (
    <View style={[{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }, surface]}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}
        onPress={toggle}
        activeOpacity={0.75}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{title}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subtext} />
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, opacity: bodyOpacity }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Add Manual Account Modal ─────────────────────────

function AddManualAccountModal({
  visible, onClose, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (platform: Platform, name: string, currency: string, color: string) => void;
}) {
  const { theme, cardSurface } = useTheme();
  const { t } = useLanguage();
  const [platform, setPlatform] = useState<Platform>('manual');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [color, setColor] = useState(CARD_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setPlatform('manual');
      setName('');
      setCurrency('UAH');
      setColor(CARD_COLORS[0]);
    }
  }, [visible]);

  const PLATFORMS: Platform[] = ['manual', 'monobank', 'privatbank', 'zen', 'ibkr'];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
          <View style={{ ...cardSurface(), borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: theme.border, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 }}>{t.settingsAddAccount}</Text>
            <GroupLabel label={t.settingsPlatform} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {PLATFORMS.map((p) => (
                <TouchableOpacity key={p} onPress={() => setPlatform(p)} style={{
                  paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                  borderColor: platform === p ? theme.accent : theme.border,
                  backgroundColor: platform === p ? theme.accent + '22' : theme.cardAlt,
                }}>
                  <Text style={{ color: platform === p ? theme.accent : theme.subtext, fontSize: 12, fontWeight: '600' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.dashCardName}</Text>
            <TextInput
              style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 12 }}
              value={name} onChangeText={setName} placeholder={t.settingsAddAccountName} placeholderTextColor={theme.subtext}
            />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 8 }}>{t.txCurrency}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['UAH', 'USD', 'EUR', 'GBP'].map((c) => (
                <TouchableOpacity key={c} onPress={() => setCurrency(c)} style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                  borderColor: currency === c ? theme.accent : theme.border,
                  backgroundColor: currency === c ? theme.accent + '22' : theme.cardAlt,
                }}>
                  <Text style={{ color: currency === c ? theme.accent : theme.subtext, fontWeight: '600' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 13, alignItems: 'center' }} onPress={onClose}>
                <Text style={{ color: theme.subtext, fontWeight: '600' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, borderRadius: 10, padding: 13, alignItems: 'center', backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.5 }}
                disabled={!name.trim()}
                onPress={() => { onAdd(platform, name.trim(), currency, color); onClose(); }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Card Edit Modal ─────────────────────────────────

function SettingsCardEditModal({
  account, visible, onClose, onSave,
}: {
  account: Account; visible: boolean; onClose: () => void;
  onSave: (name: string, color: string, currency: string) => void;
}) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const [name,  setName]  = useState(account.displayName ?? account.name);
  const [color, setColor] = useState(account.color ?? '#3b82f6');
  const [currency, setCurrency] = useState(account.currency);

  useEffect(() => {
    if (visible) {
      setName(account.displayName ?? account.name);
      setColor(account.color ?? '#3b82f6');
      setCurrency(account.currency);
    }
  }, [visible, account]);

  const ALL_CUR = ['UAH', 'USD', 'EUR', 'GBP', ...AVAILABLE_CURRENCIES.filter((c) => !['UAH','USD','EUR','GBP'].includes(c))];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
          <View style={{ ...cardSurface(), borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: theme.border, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{t.dashEditCard}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
                <Ionicons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>
            <CardPreview account={account} name={name} color={color} />
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
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 8 }}>{t.txCurrency}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ALL_CUR.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: currency === c ? theme.accent : theme.border,
                    backgroundColor: currency === c ? theme.accent + '22' : theme.cardAlt,
                  }}
                  onPress={() => setCurrency(c)}
                  activeOpacity={0.75}
                >
                  <Text style={{ color: currency === c ? theme.accent : theme.subtext, fontWeight: '600' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 13, alignItems: 'center' }} onPress={onClose} activeOpacity={0.75}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.subtext }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, borderRadius: 10, padding: 13, alignItems: 'center', backgroundColor: theme.accent }}
                onPress={() => { onSave(name.trim() || account.name, color, currency); onClose(); }}
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

// ─── Category Rule Modal ──────────────────────────────

const RULE_FIELDS: RuleMatchField[] = ['description', 'mcc', 'amount', 'platform', 'type', 'currency'];
const RULE_OPS: RuleMatchOp[] = ['contains', 'equals', 'regex', 'range'];

function CategoryRuleModal({
  visible, rule, onClose, onSaved,
}: {
  visible: boolean;
  rule?: CategoryRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme, cardSurface } = useTheme();
  const { t } = useLanguage();
  const categoryLabels = useCategoryLabels();
  const [name, setName] = useState('');
  const [matchField, setMatchField] = useState<RuleMatchField>('description');
  const [matchOp, setMatchOp] = useState<RuleMatchOp>('contains');
  const [matchValue, setMatchValue] = useState('');
  const [categoryKey, setCategoryKey] = useState<CategoryKey>('other');
  const [priority, setPriority] = useState('10');

  useEffect(() => {
    if (!visible) return;
    if (rule) {
      setName(rule.name);
      setMatchField(rule.matchField);
      setMatchOp(rule.matchOp);
      setMatchValue(rule.matchValue);
      setCategoryKey(rule.categoryKey);
      setPriority(String(rule.priority));
    } else {
      setName('');
      setMatchField('description');
      setMatchOp('contains');
      setMatchValue('');
      setCategoryKey('other');
      setPriority('10');
    }
  }, [visible, rule]);

  const fieldLabels: Record<RuleMatchField, string> = {
    mcc: t.ruleFieldMcc,
    description: t.ruleFieldDescription,
    amount: t.ruleFieldAmount,
    platform: t.ruleFieldPlatform,
    type: t.ruleFieldType,
    currency: t.ruleFieldCurrency,
  };
  const opLabels: Record<RuleMatchOp, string> = {
    contains: t.ruleOpContains,
    equals: t.ruleOpEquals,
    regex: t.ruleOpRegex,
    range: t.ruleOpRange,
  };

  const canSave = matchValue.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const trimmedValue = matchValue.trim();
    const ruleName = name.trim()
      || buildRuleDisplayName(matchField, matchOp, trimmedValue, categoryKey);
    saveCategoryRule({
      id: rule?.id,
      name: ruleName,
      categoryKey,
      priority: parseInt(priority, 10) || 10,
      matchField,
      matchOp,
      matchValue: trimmedValue,
      enabled: true,
    });
    onSaved();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
          <View style={{ ...cardSurface(), borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: theme.border, padding: 20, maxHeight: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
              {rule ? t.settingsEditRule : t.settingsAddRule}
            </Text>
            <Text style={{ fontSize: 12, color: theme.subtext, marginBottom: 12 }}>{t.settingsRuleOptionalHint}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.settingsRuleName}</Text>
              <TextInput
                style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 12 }}
                value={name} onChangeText={setName} placeholder={t.settingsRuleNameOptional} placeholderTextColor={theme.subtext}
              />
              <GroupLabel label={t.settingsRuleField} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {RULE_FIELDS.map((f) => (
                  <TouchableOpacity key={f} onPress={() => setMatchField(f)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: matchField === f ? theme.accent : theme.border,
                    backgroundColor: matchField === f ? theme.accent + '22' : theme.cardAlt,
                  }}>
                    <Text style={{ color: matchField === f ? theme.accent : theme.subtext, fontSize: 12, fontWeight: '600' }}>{fieldLabels[f]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <GroupLabel label={t.settingsRuleOp} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {RULE_OPS.map((op) => (
                  <TouchableOpacity key={op} onPress={() => setMatchOp(op)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: matchOp === op ? theme.accent : theme.border,
                    backgroundColor: matchOp === op ? theme.accent + '22' : theme.cardAlt,
                  }}>
                    <Text style={{ color: matchOp === op ? theme.accent : theme.subtext, fontSize: 12, fontWeight: '600' }}>{opLabels[op]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.settingsRuleValue}</Text>
              <TextInput
                style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 12 }}
                value={matchValue} onChangeText={setMatchValue} placeholder={matchOp === 'range' ? '100-5000' : 'steam|xbox'} placeholderTextColor={theme.subtext}
              />
              <GroupLabel label={t.settingsRuleCategory} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {ALL_CATEGORY_KEYS.map((k) => (
                  <TouchableOpacity key={k} onPress={() => setCategoryKey(k)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: categoryKey === k ? theme.accent : theme.border,
                    backgroundColor: categoryKey === k ? theme.accent + '22' : theme.cardAlt,
                  }}>
                    <Text style={{ color: categoryKey === k ? theme.accent : theme.subtext, fontSize: 11, fontWeight: '600' }}>{categoryLabels[k]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.settingsRulePriority}</Text>
              <TextInput
                style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 16 }}
                value={priority} onChangeText={setPriority} keyboardType="number-pad" placeholderTextColor={theme.subtext}
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 13, alignItems: 'center' }} onPress={onClose}>
                <Text style={{ color: theme.subtext, fontWeight: '600' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, borderRadius: 10, padding: 13, alignItems: 'center', backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Import with duplicate confirmation ─────────────

function confirmImportTransactions(
  label: string,
  transactions: UnifiedTransaction[],
  upsert: (txs: UnifiedTransaction[]) => { inserted: number; total: number },
  showResult: (lbl: string, result: { inserted: number }) => void,
  show: ReturnType<typeof useAppAlert>['show'],
  t: ReturnType<typeof useLanguage>['t'],
) {
  const { duplicates, unique } = analyzeImportDuplicates(transactions);
  if (duplicates.length === 0) {
    showResult(label, upsert(transactions));
    return;
  }
  const msg = t.importDuplicatesMessage
    .replace('{dup}', String(duplicates.length))
    .replace('{total}', String(transactions.length));
  show(t.importDuplicatesTitle, msg, [
    {
      text: t.importRejectDuplicates,
      style: 'cancel',
      onPress: () => {
        if (unique.length > 0) showResult(label, upsert(unique));
      },
    },
    {
      text: t.importAddAnyway,
      onPress: () => {
        const extra = duplicates.map(reassignTransactionId);
        showResult(label, upsert([...unique, ...extra]));
      },
    },
  ]);
}

// ─── Main Screen ──────────────────────────────────────

export function SettingsScreen() {
  const {
    theme, themeKey, accent, setThemeKey, setAccent,
    animationSpeed, transparencyPct,
    setAnimationSpeed, setTransparencyPct, cardSurface,
  } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { accounts, loadAccounts, addAccount, updateBalance, updateAccount, deactivateAccount } = useAccountsStore();
  const { upsertTransactions } = useTransactionsStore();
  const { show, element: alertEl } = useAppAlert();

  const [syncing,        setSyncing]        = useState(false);
  const [progress,       setProgress]       = useState<SyncProgress | null>(null);
  const [prefCurrencies, setPrefCurrencies] = useState<string[]>(['USD','EUR','GBP']);
  const [homeCurrency,   setHomeCurrencyState] = useState<string>('UAH');
  const [editAccount,    setEditAccount]    = useState<Account | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddRule,    setShowAddRule]    = useState(false);
  const [editRule,       setEditRule]       = useState<CategoryRule | null>(null);
  const [categoryRules,  setCategoryRules]  = useState(() => loadCategoryRules());
  const categoryLabels = useCategoryLabels();
  const [reTagging,      setReTagging]      = useState(false);

  useEffect(() => {
    loadAccounts();
    seedDefaultCategoryRules();
    setCategoryRules(loadCategoryRules());
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
    void refreshAppData('all');
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
        onPress: async () => {
          try {
            const db = getDatabase();
            db.runSync('DELETE FROM transactions');
            await refreshAppData('all');
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
            await refreshAppData('all');
            show(t.done, t.settingsResetDone);
          } catch (e) {
            show(t.error, String((e as Error)?.message ?? e));
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
        amount: number; platform: string; type: string; currency: string;
      }>(`SELECT id, mcc, description, raw_payload, amount, platform, type, currency FROM transactions`);
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);
      let updated = 0;
      db.withTransactionSync(() => {
        for (const row of rows) {
          const tag = row.raw_payload
            ? retagFromRawPayload(row.raw_payload, row.mcc ?? undefined, row.description ?? undefined, ownIbans, accounts)
            : undefined;
          let bankCategory: string | undefined;
          if (row.raw_payload) {
            try {
              const raw = JSON.parse(row.raw_payload) as { bankCat?: string };
              bankCategory = raw.bankCat?.trim() || undefined;
            } catch {}
          }
          const catKey = autoDetectCategoryKey(
            row.mcc ?? undefined,
            row.description ?? undefined,
            tag,
            bankCategory,
            ownIbans,
            {
              amount: row.amount,
              platform: row.platform as Platform,
              type: row.type,
              currency: row.currency,
            },
          );
          db.runSync(
            'UPDATE transactions SET tag = ?, category = ? WHERE id = ?',
            [catKey, catKey, row.id],
          );
          updated++;
        }
      });
      useTransactionsStore.getState().loadRecentTransactions();
      await refreshAppData('all');
      show(t.done, t.settingsRetagSuccess.replace('{count}', String(updated)));
    } catch (e) {
      show(t.error, String((e as Error)?.message ?? e));
    } finally {
      setReTagging(false);
    }
  }

  const syncMonobank = useCallback(async () => {
    const token = await tokenStore.get(TOKEN_KEYS.monobank);
    if (!token) { show(t.settingsTokenMissing, t.settingsTokenMissingHint); return; }

    setSyncing(true);
    setProgress({ step: t.settingsMonoConnecting, current: 0, total: 1 });

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
      const allTxs: UnifiedTransaction[] = [];

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
              if (txs.length > 0) allTxs.push(...txs);
            } catch (e: unknown) {
              if ((e as Error)?.message === 'rate_limit') {
                setProgress({ step: t.settingsMonoRateLimit, current: done, total });
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
            setProgress({ step: t.settingsMonoPause, current: done, total });
            await new Promise((r) => setTimeout(r, 62_000));
          }
        }
      }
      setProgress({ step: t.settingsMonoSyncDone, current: total, total });
      if (allTxs.length > 0) {
        confirmImportTransactions('Monobank', allTxs, upsertTransactions, showImportResult, show, t);
      } else {
        await refreshAppData('analytics');
        show(t.done, t.settingsMonoSyncNoNew);
      }
    } catch (e: unknown) {
      show(t.settingsSyncError, String((e as Error)?.message ?? e));
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(null), 3000);
      loadAccounts();
    }
  }, [accounts]);

  // ─── CSV Import handlers ─────────────────────────

  function showImportResult(label: string, result: { inserted: number }) {
    if (result.inserted > 0) {
      const msg = t.importCsvSuccess.replace('{count}', String(result.inserted));
      show(t.importCsvImportedTitle.replace('{label}', label), msg);
      void refreshAppData('analytics');
    } else {
      show(label, t.importCsvNoTx);
    }
  }

  async function handleZenImport(uri: string, _name: string, accountId: string) {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);

      const { transactions } = parseZenCsv(content, accountId, ownIbans, accounts);
      if (transactions.length > 0) {
        confirmImportTransactions('ZEN', transactions, upsertTransactions, showImportResult, show, t);
      } else {
        show('ZEN', t.importCsvNoTx);
      }
    } catch (e) {
      show(t.importCsvError, String((e as Error)?.message ?? e));
    }
  }

  async function handleMonoCsvImport(
    uri: string,
    _name: string,
    accountId: string,
    options?: { currencyMode: MonoCsvCurrencyMode },
  ) {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);
      const acc = accounts.find((a) => a.id === accountId);
      const currencyMode = options?.currencyMode ?? 'account';

      const { transactions } = parseMonobankCsv(content, accountId, ownIbans, accounts, {
        currencyMode,
        accountCurrency: acc?.currency ?? 'UAH',
      });
      if (transactions.length > 0) {
        confirmImportTransactions('Monobank CSV', transactions, upsertTransactions, showImportResult, show, t);
      } else {
        show('Monobank CSV', t.importCsvNoTx);
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
        confirmImportTransactions('PrivatBank', transactions, upsertTransactions, showImportResult, show, t);
      } else {
        show('PrivatBank', t.importCsvNoTx);
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
          <View style={[s.accentRow, { marginBottom: 16 }]}>
            {ACCENT_PRESETS.map((c) => (
              <TouchableOpacity key={c} style={[s.accentDot, { backgroundColor: c }, accent === c && s.accentDotActive]} onPress={() => setAccent(c)} />
            ))}
          </View>

          <GroupLabel label={t.settingsTransparency} />
          <Text style={[s.hintText, { marginBottom: 8 }]}>{t.settingsTransparencyHint}</Text>
          <View style={[s.glassPreview, cardSurface(true), { borderColor: theme.border, marginBottom: 12 }]}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>{t.settingsTransparencyPreview}</Text>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{t.settingsTransparencyPreviewHint}</Text>
          </View>
          <SettingSlider
            value={transparencyPct}
            min={0}
            max={100}
            step={1}
            onChange={setTransparencyPct}
            format={(v) => `${Math.round(v)}%`}
          />

          <GroupLabel label={t.settingsAnimSpeed} />
          <Text style={[s.hintText, { marginBottom: 4 }]}>{t.settingsAnimSpeedHint}</Text>
          <SettingSlider
            value={animationSpeed}
            min={0.5}
            max={2}
            step={0.1}
            onChange={setAnimationSpeed}
            format={(v) => `${Math.round(((v - 0.5) / 1.5) * 100)}%`}
          />
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

        {/* ─── 3. Platform connections (API + CSV per platform) ── */}
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
              <Ionicons name="sync-outline" size={18} color="#fff" />
              <Text style={s.syncBtnText}>{syncing ? t.settingsSyncing : t.settingsSyncMono}</Text>
            </TouchableOpacity>
            <SyncBanner progress={syncing ? progress : null} />
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
          </PlatformCsvPanel>
        </Section>

        {/* ─── Cards & Tags ── */}
        <Section title={t.settingsCardsAndTags} icon="card-outline">
          <TouchableOpacity
            style={[s.syncBtn, { marginBottom: 12 }]}
            onPress={() => setShowAddAccount(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={s.syncBtnText}>{t.settingsAddAccount}</Text>
          </TouchableOpacity>

          <GroupLabel label={t.settingsCategoryRules} />
          <Text style={[s.hintText, { marginBottom: 8 }]}>{t.settingsCategoryRulesHint}</Text>
          <TouchableOpacity
            style={[s.syncBtn, { marginBottom: 12, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.border }]}
            onPress={() => { setEditRule(null); setShowAddRule(true); }}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
            <Text style={[s.syncBtnText, { color: theme.accent }]}>{t.settingsAddRule}</Text>
          </TouchableOpacity>
          {categoryRules.map((rule) => (
            <View key={rule.id} style={[s.accountRow, { marginBottom: 6 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{rule.name}</Text>
                <Text style={s.accountMeta}>{rule.matchField} · {rule.matchOp} · {categoryLabels[rule.categoryKey] ?? rule.categoryKey}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditRule(rule); setShowAddRule(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 10 }}>
                <Ionicons name="pencil-outline" size={16} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { deleteCategoryRule(rule.id); setCategoryRules(loadCategoryRules()); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color={theme.expense} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[s.hintText, { marginBottom: 12, marginTop: 8 }]}>{t.settingsReAutoTagHint}</Text>
          <TouchableOpacity
            style={[s.syncBtn, reTagging && { opacity: 0.6 }, { marginBottom: 16 }]}
            onPress={handleReAutoTag}
            disabled={reTagging}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={s.syncBtnText}>{reTagging ? t.settingsRetagging : t.settingsReAutoTag}</Text>
          </TouchableOpacity>

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

        {/* ─── Danger Zone ── */}
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
          onSave={(name, color, currency) => {
            updateAccount(editAccount.id, { displayName: name, color, currency });
            setEditAccount(null);
          }}
        />
      )}
      <AddManualAccountModal
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        onAdd={(platform, name, currency, color) => {
          addAccount({ platform, name, currency, color, displayName: name, balance: 0, isActive: true });
          loadAccounts();
        }}
      />
      <CategoryRuleModal
        visible={showAddRule}
        rule={editRule}
        onClose={() => { setShowAddRule(false); setEditRule(null); }}
        onSaved={() => setCategoryRules(loadCategoryRules())}
      />
    </SafeAreaView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    hintText:  { color: t.subtext, fontSize: 13, lineHeight: 18 },
    glassPreview: { borderRadius: 12, borderWidth: 1, padding: 14 },

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
