import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tokenStore, TOKEN_KEYS } from '../security/tokenStore';
import { useAccountsStore } from '../store/accountsSlice';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useTheme } from '../theme/ThemeContext';
import { THEME_LABELS, ThemeKey, ACCENT_PRESETS, AppTheme } from '../theme';
import { useAppAlert } from '../components/AppAlert';
import {
  fetchMonoClientInfo,
  fetchMonoStatement,
  monoStatementToTx,
  SyncProgress,
} from '../api/monobank';
import type { Platform } from '../types';

// ─── Token Block ─────────────────────────────────

function TokenBlock({
  title, hint, tokenKey, onSaved,
}: {
  platform: Platform;
  title:    string;
  hint:     string;
  tokenKey: string;
  onSaved:  () => void;
}) {
  const { theme } = useTheme();
  const { show, element: alertEl } = useAppAlert();
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const [show2, setShow2] = useState(false);

  useEffect(() => {
    tokenStore.get(tokenKey).then((v) => { if (v) setSaved(true); });
  }, [tokenKey]);

  async function handleSave() {
    if (!value.trim()) return;
    await tokenStore.set(tokenKey, value.trim());
    setSaved(true);
    setValue('');
    show('Збережено', `Токен ${title} збережено у захищеному сховищі`);
    onSaved();
  }

  function handleDelete() {
    show('Видалити токен?', `Токен ${title} буде видалено`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити', style: 'destructive',
        onPress: async () => {
          await tokenStore.delete(tokenKey);
          setSaved(false);
          setValue('');
        },
      },
    ]);
  }

  const s = makeStyles(theme);
  return (
    <View style={s.tokenBlock}>
      {alertEl}
      <View style={s.tokenHeader}>
        <Text style={s.tokenTitle}>{title}</Text>
        {saved && (
          <View style={s.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.income} />
            <Text style={[s.savedText, { color: theme.income }]}>Підключено</Text>
          </View>
        )}
      </View>
      <Text style={s.tokenHint}>{hint}</Text>

      {!saved && (
        <>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Вставте токен..."
              placeholderTextColor={theme.subtext}
              value={value}
              onChangeText={setValue}
              secureTextEntry={!show2}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShow2(!show2)}>
              <Ionicons name={show2 ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.saveBtn, !value.trim() && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!value.trim()}
          >
            <Text style={s.saveBtnText}>Зберегти</Text>
          </TouchableOpacity>
        </>
      )}

      {saved && (
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={14} color={theme.expense} />
          <Text style={[s.deleteBtnText, { color: theme.expense }]}>Відключити</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Sync Progress Banner ────────────────────────

function SyncBanner({ progress }: { progress: SyncProgress | null }) {
  const { theme } = useTheme();
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
          Запит {progress.current} з {progress.total} · Liміт API: ~62 с між запитами
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

// ─── Main Screen ──────────────────────────────────

export function SettingsScreen() {
  const { theme, themeKey, accent, setThemeKey, setAccent } = useTheme();
  const { accounts, loadAccounts, addAccount, updateBalance, deactivateAccount } = useAccountsStore();
  const { upsertTransactions } = useTransactionsStore();
  const { show, element: alertEl } = useAppAlert();

  const [syncing,  setSyncing]  = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  function handleDeactivate(id: string) {
    show('Видалити рахунок?', 'Транзакції залишаться в базі', [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Видалити', style: 'destructive', onPress: () => deactivateAccount(id) },
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
      // 1. Fetch client info
      const { accounts: monoAccounts } = await fetchMonoClientInfo(token);

      const nowSec  = Math.floor(Date.now() / 1000);
      const fromSec = nowSec - 90 * 24 * 60 * 60; // 90 days back
      const MAX_WIN = 30 * 24 * 60 * 60;
      const windows: Array<{ from: number; to: number }> = [];
      for (let t = fromSec; t < nowSec; t += MAX_WIN) {
        windows.push({ from: t, to: Math.min(t + MAX_WIN, nowSec) });
      }

      const total = monoAccounts.length * windows.length;
      let done = 0;

      for (const { raw, account } of monoAccounts) {
        // Upsert account in DB
        const existingAcc = accounts.find((a) => a.externalId === raw.id);
        let internalId = existingAcc?.id;
        if (!existingAcc) {
          addAccount(account);
          // Get the newly added account id
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
            setProgress({ step: `Пауза між запитами…`, current: done, total });
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

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {alertEl}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ─── Theme ── */}
        <Text style={s.groupTitle}>Тема оформлення</Text>
        <View style={s.themeRow}>
          {(['dark', 'cursor', 'oled'] as ThemeKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[s.themeBtn, themeKey === key && { borderColor: theme.accent }]}
              onPress={() => setThemeKey(key)}
            >
              <View style={[s.themeDot, { backgroundColor: key === 'oled' ? '#000' : key === 'cursor' ? '#1b1b2f' : '#0f172a' }]} />
              <Text style={[s.themeBtnLabel, themeKey === key && { color: theme.accent }]}>
                {THEME_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Accent ── */}
        <Text style={[s.groupTitle, { marginTop: 20 }]}>Акцентний колір</Text>
        <View style={s.accentRow}>
          {ACCENT_PRESETS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.accentDot, { backgroundColor: c }, accent === c && s.accentDotActive]}
              onPress={() => setAccent(c)}
            />
          ))}
        </View>

        {/* ─── Platforms ── */}
        <Text style={[s.groupTitle, { marginTop: 24 }]}>Підключення платформ</Text>
        <Text style={s.groupHint}>
          Токени зберігаються у захищеному сховищі пристрою (Keychain / Keystore).
        </Text>

        {/* Monobank sync button */}
        <TouchableOpacity
          style={[s.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={syncMonobank}
          disabled={syncing}
        >
          <Ionicons name="sync-outline" size={18} color="#fff" />
          <Text style={s.syncBtnText}>
            {syncing ? 'Синхронізація…' : 'Синхронізувати Monobank'}
          </Text>
        </TouchableOpacity>

        <SyncBanner progress={syncing ? progress : null} />

        <TokenBlock
          platform="monobank"
          title="Monobank X-Token"
          hint="api.monobank.ua → «Для розробників» → Скопіювати токен"
          tokenKey={TOKEN_KEYS.monobank}
          onSaved={syncMonobank}
        />
        <TokenBlock
          platform="ibkr"
          title="IBKR Flex Token"
          hint="Client Portal → Reports → Flex Queries → Manage Flex Tokens"
          tokenKey={TOKEN_KEYS.ibkrFlexToken}
          onSaved={loadAccounts}
        />
        <TokenBlock
          platform="ibkr"
          title="IBKR Query ID"
          hint="ID Flex Query (число, наприклад: 123456)"
          tokenKey={TOKEN_KEYS.ibkrQueryId}
          onSaved={loadAccounts}
        />
        <TokenBlock
          platform="privatbank"
          title="Salt Edge App ID"
          hint="saltedge.com → My Applications → App ID"
          tokenKey={TOKEN_KEYS.saltEdgeAppId}
          onSaved={loadAccounts}
        />

        {/* ─── Accounts ── */}
        <Text style={[s.groupTitle, { marginTop: 24 }]}>Рахунки</Text>
        {accounts.filter((a) => a.id !== 'acc_default').length === 0 ? (
          <View style={s.emptyAccounts}>
            <Text style={s.emptyAccountsText}>
              Після підключення платформи та синхронізації тут з'являться ваші рахунки.
            </Text>
          </View>
        ) : (
          accounts
            .filter((a) => a.id !== 'acc_default')
            .map((a) => (
              <View key={a.id} style={s.accountRow}>
                <View>
                  <Text style={s.accountName}>{a.name}</Text>
                  <Text style={s.accountMeta}>{a.platform.toUpperCase()} · {a.currency}</Text>
                </View>
                <View style={s.accountRight}>
                  {a.balance != null && (
                    <Text style={s.accountBalance}>
                      {a.balance.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} {a.currency}
                    </Text>
                  )}
                  <TouchableOpacity onPress={() => handleDeactivate(a.id)}>
                    <Ionicons name="trash-outline" size={18} color={theme.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}

        <View style={s.aboutSection}>
          <Text style={s.aboutTitle}>Finance Control v1.0</Text>
          <Text style={s.aboutText}>
            Весь облік ведеться локально на пристрої.{'\n'}Хмарних серверів немає.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: t.bg },
    groupTitle:  { color: t.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
    groupHint:   { color: t.subtext, fontSize: 13, lineHeight: 18, marginBottom: 12 },

    themeRow:    { flexDirection: 'row', gap: 10 },
    themeBtn:    {
      flex: 1, alignItems: 'center', padding: 12,
      backgroundColor: t.card, borderRadius: 12,
      borderWidth: 2, borderColor: t.border, gap: 6,
    },
    themeDot:    { width: 28, height: 28, borderRadius: 14 },
    themeBtnLabel: { color: t.subtext, fontSize: 11, fontWeight: '600', textAlign: 'center' },

    accentRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    accentDot:   { width: 34, height: 34, borderRadius: 17 },
    accentDotActive: { borderWidth: 3, borderColor: '#fff' },

    syncBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.accent, borderRadius: 10,
      padding: 12, marginBottom: 12, justifyContent: 'center',
    },
    syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    tokenBlock:  { backgroundColor: t.card, borderRadius: 12, padding: 16, marginBottom: 12 },
    tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    tokenTitle:  { color: t.text, fontSize: 15, fontWeight: '600' },
    savedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    savedText:   { fontSize: 12 },
    tokenHint:   { color: t.subtext, fontSize: 12, marginBottom: 12 },
    inputRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
    input: {
      backgroundColor: t.inputBg, borderRadius: 8, padding: 12,
      color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.border,
    },
    eyeBtn:     { backgroundColor: t.inputBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: t.border },
    saveBtn:    { backgroundColor: t.accent, borderRadius: 8, padding: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    deleteBtnText: { fontSize: 13 },

    accountRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: t.card, borderRadius: 10, padding: 14, marginBottom: 8,
    },
    accountName:    { color: t.text, fontSize: 14, fontWeight: '600' },
    accountMeta:    { color: t.subtext, fontSize: 12, marginTop: 2 },
    accountRight:   { alignItems: 'flex-end', gap: 8 },
    accountBalance: { color: t.text, fontSize: 13 },

    emptyAccounts: { backgroundColor: t.card, borderRadius: 10, padding: 16, marginBottom: 8 },
    emptyAccountsText: { color: t.subtext, fontSize: 14, lineHeight: 20 },

    aboutSection: { marginTop: 32, alignItems: 'center', paddingBottom: 20 },
    aboutTitle:   { color: t.subtext, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    aboutText:    { color: t.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  });
}
