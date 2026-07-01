import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, Animated, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import type { Platform as BankPlatform, Account } from '../types';
import { getDatabase } from '../db/migrations';
import { currencySymbol } from '../utils/currency';


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
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon, defaultExpanded = false, children }: SectionProps) {
  const { theme }    = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const chevronAnim  = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const bodyOpacity  = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const bodySlide    = useRef(new Animated.Value(defaultExpanded ? 0 : -8)).current;

  function toggle() {
    const toValue = expanded ? 0 : 1;
    LayoutAnimation.configureNext({
      duration: 280,
      create:  { type: 'spring', property: 'scaleXY', springDamping: 0.85 },
      update:  { type: 'spring', springDamping: 0.85 },
      delete:  { type: 'spring', property: 'scaleXY', springDamping: 0.85 },
    });
    Animated.parallel([
      Animated.spring(chevronAnim, { toValue, useNativeDriver: true, damping: 18, stiffness: 220 }),
      Animated.spring(bodyOpacity, { toValue, useNativeDriver: true, damping: 18, stiffness: 220 }),
      Animated.spring(bodySlide,   { toValue: toValue === 1 ? 0 : -8, useNativeDriver: true, damping: 18, stiffness: 220 }),
    ]).start();
    setExpanded((v) => !v);
  }

  const chevronRotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[secStyles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity
        style={secStyles.header}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconWrap, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name={icon as any} size={16} color={theme.accent} />
          </View>
          <Text style={[secStyles.title, { color: theme.text }]}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={18} color={theme.subtext} />
        </Animated.View>
      </TouchableOpacity>
      {expanded && (
        <Animated.View
          style={[
            secStyles.body,
            { borderTopColor: theme.border },
            { opacity: bodyOpacity, transform: [{ translateY: bodySlide }] },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600' },
  body: { borderTopWidth: 1, padding: 16 },
});

// ─── Group Label ──────────────────────────────────────

function GroupLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[groupStyles.label, { color: theme.subtext }]}>{label}</Text>
  );
}
const groupStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
});

// ─── Token Block ──────────────────────────────────────

function TokenBlock({
  title, hint, tokenKey, instructions, onSaved,
}: {
  platform:     BankPlatform;
  title:        string;
  hint:         string;
  tokenKey:     string;
  instructions: string;
  onSaved:      () => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { show, element: alertEl } = useAppAlert();
  const [value,        setValue]        = useState('');
  const [saved,        setSaved]        = useState(false);
  const [showPwd,      setShowPwd]      = useState(false);
  const [showInstr,    setShowInstr]    = useState(false);

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

      {/* Expandable instructions */}
      <TouchableOpacity
        style={s.instrToggle}
        onPress={() => setShowInstr((v) => !v)}
        activeOpacity={0.75}
      >
        <Ionicons
          name={showInstr ? 'chevron-up' : 'information-circle-outline'}
          size={14}
          color={theme.accent}
        />
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

// ─── Sync Progress Banner ─────────────────────────────

function SyncBanner({ progress }: { progress: SyncProgress | null }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  if (!progress) return null;
  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  return (
    <View style={[bStyles.wrap, { backgroundColor: theme.card, borderColor: theme.accent }]}>
      <View style={bStyles.row}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[bStyles.step, { color: theme.text }]} numberOfLines={1}>{progress.step}</Text>
        <Text style={[bStyles.pct, { color: theme.accent }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[bStyles.track, { backgroundColor: theme.border }]}>
        <View style={[bStyles.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
      </View>
      {progress.total > 1 && (
        <Text style={[bStyles.hint, { color: theme.subtext }]}>
          {t.settingsApiRateLimit
            .replace('{current}', String(progress.current))
            .replace('{total}', String(progress.total))}
        </Text>
      )}
    </View>
  );
}

const bStyles = StyleSheet.create({
  wrap:  { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  step:  { flex: 1, fontSize: 13 },
  pct:   { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
  hint:  { fontSize: 11, marginTop: 6, lineHeight: 16 },
});

// ─── Card Edit Modal (inline for Settings) ────────────

function SettingsCardEditModal({
  account, visible, onClose, onSave,
}: {
  account: Account;
  visible: boolean;
  onClose: () => void;
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: theme.border, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{t.dashEditCard}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
                <Ionicons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            {/* Preview */}
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
  const { show, element: alertEl } = useAppAlert();

  const [syncing,        setSyncing]        = useState(false);
  const [progress,       setProgress]       = useState<SyncProgress | null>(null);
  const [prefCurrencies, setPrefCurrencies] = useState<string[]>(['USD','EUR','GBP']);
  const [homeCurrency,   setHomeCurrency]   = useState<string>('UAH');
  const [editAccount,    setEditAccount]    = useState<Account | null>(null);

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
      if (row?.home_currency) setHomeCurrency(row.home_currency);
    } catch {}
  }, []);

  function savePrefCurrencies(updated: string[]) {
    setPrefCurrencies(updated);
    try {
      getDatabase().runSync(
        'UPDATE settings SET preferred_currencies = ? WHERE id = 1',
        [JSON.stringify(updated)]
      );
    } catch {}
  }

  function toggleCurrency(code: string) {
    const updated = prefCurrencies.includes(code)
      ? prefCurrencies.filter((c) => c !== code)
      : [...prefCurrencies, code];
    savePrefCurrencies(updated);
  }

  function saveHomeCurrency(code: string) {
    setHomeCurrency(code);
    try {
      getDatabase().runSync(
        'UPDATE settings SET home_currency = ? WHERE id = 1',
        [code]
      );
    } catch {}
  }

  function handleDeactivate(id: string) {
    show(t.deleteAccount, t.txWillRemain, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => deactivateAccount(id) },
    ]);
  }

  const syncMonobank = useCallback(async () => {
    const token = await tokenStore.get(TOKEN_KEYS.monobank);
    if (!token) {
      show('Токен відсутній', 'Спочатку збережіть Monobank X-Token у полі нижче.');
      return;
    }

    setSyncing(true);
    setProgress({ step: 'Підключення до Monobank…', current: 0, total: 1 });

    try {
      const { accounts: monoAccounts } = await fetchMonoClientInfo(token);

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
            current: done,
            total,
          });

          try {
            const stmts = await fetchMonoStatement(token, raw.id, win.from, win.to);
            const txs   = stmts.map((s) => monoStatementToTx(s, internalId!));
            if (txs.length > 0) upsertTransactions(txs);
          } catch (e: unknown) {
            if ((e as Error)?.message === 'rate_limit') {
              setProgress({ step: 'Ліміт API — чекаємо 65 с…', current: done, total });
              await new Promise((r) => setTimeout(r, 65_000));
              done--;
              continue;
            }
            console.warn('[mono sync]', e);
          }

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

  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {alertEl}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ─── 1. App Appearance ── */}
        <Section title={t.settingsAppearance} icon="color-palette-outline" defaultExpanded>
          <GroupLabel label={t.settingsTheme} />
          <View style={s.themeRow}>
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
                  <View style={[s.themeDot, {
                    backgroundColor: colors[key],
                    borderWidth: key === 'light' ? 1 : 0,
                    borderColor: theme.border,
                  }]} />
                  <Text style={[s.themeBtnLabel, themeKey === key && { color: theme.accent }]}>
                    {THEME_LABELS[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <GroupLabel label={t.settingsAccentColor} />
          <View style={s.accentRow}>
            {ACCENT_PRESETS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.accentDot, { backgroundColor: c }, accent === c && s.accentDotActive]}
                onPress={() => setAccent(c)}
              />
            ))}
          </View>
        </Section>

        {/* ─── 2. User Preferences ── */}
        <Section title={t.settingsUserPreferences} icon="person-circle-outline">
          <GroupLabel label={t.settingsLanguage} />
          <View style={s.langRow}>
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
          <View style={s.currenciesWrap}>
            {(['UAH', ...AVAILABLE_CURRENCIES]).map((code) => {
              const active = homeCurrency === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[s.currencyChip, {
                    backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                    borderColor:     active ? theme.accent : theme.border,
                  }]}
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
                  style={[s.currencyChip, {
                    backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                    borderColor:     active ? theme.accent : theme.border,
                  }]}
                  onPress={() => toggleCurrency(code)}
                >
                  <Text style={[s.currencyChipText, { color: active ? theme.accent : theme.subtext }]}>
                    {code}
                  </Text>
                  {active && <Ionicons name="checkmark" size={12} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ─── 3. API Keys ── */}
        <Section title={t.settingsApiKeys} icon="key-outline">
          <Text style={[s.hintText, { marginBottom: 16 }]}>{t.settingsPlatformsHint}</Text>

          <TouchableOpacity
            style={[s.syncBtn, syncing && { opacity: 0.6 }]}
            onPress={syncMonobank}
            disabled={syncing}
          >
            <Ionicons name="sync-outline" size={18} color="#fff" />
            <Text style={s.syncBtnText}>
              {syncing ? t.settingsSyncing : t.settingsSyncMono}
            </Text>
          </TouchableOpacity>

          <SyncBanner progress={syncing ? progress : null} />

          <TokenBlock
            platform="monobank"
            title="Monobank X-Token"
            hint="api.monobank.ua → «Для розробників» → Скопіювати токен"
            tokenKey={TOKEN_KEYS.monobank}
            instructions={t.settingsMonobankInstructions}
            onSaved={syncMonobank}
          />
          <TokenBlock
            platform="ibkr"
            title="IBKR Flex Token"
            hint="Client Portal → Reports → Flex Queries → Manage Flex Tokens"
            tokenKey={TOKEN_KEYS.ibkrFlexToken}
            instructions={t.settingsIbkrTokenInstructions}
            onSaved={loadAccounts}
          />
          <TokenBlock
            platform="ibkr"
            title="IBKR Query ID"
            hint="ID Flex Query (число, наприклад: 123456)"
            tokenKey={TOKEN_KEYS.ibkrQueryId}
            instructions={t.settingsIbkrQueryInstructions}
            onSaved={loadAccounts}
          />
          <TokenBlock
            platform="privatbank"
            title="Salt Edge App ID"
            hint="saltedge.com → My Applications → App ID"
            tokenKey={TOKEN_KEYS.saltEdgeAppId}
            instructions={t.settingsSaltEdgeInstructions}
            onSaved={loadAccounts}
          />
        </Section>

        {/* ─── 4. Card Settings ── */}
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
                  <Text style={s.accountMeta}>{a.platform.toUpperCase()} · {a.currency}</Text>
                </View>
                <View style={s.accountRight}>
                  {a.balance != null && (
                    <Text style={s.accountBalance}>
                      {a.balance.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} {a.currency}
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

        {/* About */}
        <View style={s.aboutSection}>
          <Text style={s.aboutTitle}>{t.settingsAbout}</Text>
          <Text style={s.aboutText}>{t.settingsAboutLocal}</Text>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Card Edit Modal */}
      {editAccount && (
        <SettingsCardEditModal
          account={editAccount}
          visible={!!editAccount}
          onClose={() => setEditAccount(null)}
          onSave={(name, color) => {
            updateDisplay(editAccount.id, name, color);
            setEditAccount(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: t.bg },
    hintText:   { color: t.subtext, fontSize: 13, lineHeight: 18 },

    themeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    themeBtn: {
      width: '48%', height: 80, alignItems: 'center', justifyContent: 'center', padding: 10,
      backgroundColor: t.cardAlt, borderRadius: 12,
      borderWidth: 2, borderColor: t.border, gap: 6,
    },
    themeDot:       { width: 26, height: 26, borderRadius: 13 },
    themeBtnLabel:  { color: t.subtext, fontSize: 10, fontWeight: '600', textAlign: 'center' },

    accentRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    accentDot:  { width: 34, height: 34, borderRadius: 17 },
    accentDotActive: { borderWidth: 3, borderColor: '#fff' },

    langRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
    langBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.cardAlt,
    },
    langBtnText: { fontSize: 14, fontWeight: '600' },

    currenciesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    currencyChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 12, borderWidth: 1,
    },
    currencyChipText: { fontSize: 13, fontWeight: '600' },

    syncBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.accent, borderRadius: 10,
      padding: 12, marginBottom: 12, justifyContent: 'center',
    },
    syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    tokenBlock:  { backgroundColor: t.cardAlt, borderRadius: 12, padding: 14, marginBottom: 10 },
    tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    tokenTitle:  { color: t.text, fontSize: 14, fontWeight: '600' },
    savedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    savedText:   { fontSize: 12 },
    tokenHint:   { color: t.subtext, fontSize: 12, marginBottom: 10 },
    inputRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
    input: {
      backgroundColor: t.inputBg, borderRadius: 8, padding: 12,
      color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.border,
    },
    eyeBtn:     { backgroundColor: t.inputBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: t.border },
    saveBtn:    { backgroundColor: t.accent, borderRadius: 8, padding: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    deleteBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    deleteBtnText: { fontSize: 13 },

    instrToggle:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 4 },
    instrToggleText: { fontSize: 12, fontWeight: '600' },
    instrBox:        { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 8 },
    instrText:       { fontSize: 12, lineHeight: 18 },

    accountRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: t.bg, borderRadius: 10, padding: 12, marginBottom: 8,
      gap: 10,
    },
    accountColorDot: { width: 10, height: 10, borderRadius: 5 },
    accountName:     { color: t.text, fontSize: 14, fontWeight: '600' },
    accountMeta:     { color: t.subtext, fontSize: 12, marginTop: 2 },
    accountRight:    { alignItems: 'flex-end', gap: 8 },
    accountBalance:  { color: t.text, fontSize: 13 },

    emptyAccounts:     { alignItems: 'center', padding: 20, gap: 8 },
    emptyAccountsText: { color: t.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    aboutSection: { marginTop: 24, alignItems: 'center', paddingBottom: 20 },
    aboutTitle:   { color: t.subtext, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    aboutText:    { color: t.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  });
}
