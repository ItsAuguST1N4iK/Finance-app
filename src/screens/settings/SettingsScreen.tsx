import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAccountsStore } from '../../store/accountsSlice';
import { useTransactionsStore } from '../../store/transactionsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppAlert } from '../../components/AppAlert';
import { useImportDuplicatesConfirm } from '../../hooks/useImportDuplicatesConfirm';
import { AddAccountModal } from '../../components/AddAccountModal';
import {
  seedDefaultCategoryRules,
  ensureEssentialCategoryRules,
  loadAllCategoryRules,
} from '../../utils/categoryRules';
import type { CategoryRule } from '../../utils/categoryRules';
import type { Account } from '../../types';
import {
  loadPreferredCurrencies,
  loadHomeCurrency,
} from '../../utils/settingsPrefs';
import { makeStyles } from './settingsStyles';
import { layout } from '../../theme/tokens';
import { AppearanceSection } from './AppearanceSection';
import { PreferencesSection } from './PreferencesSection';
import { PlatformsSection } from './PlatformsSection';
import { AccountsRulesSection } from './AccountsRulesSection';
import { DangerSection } from './DangerSection';
import { CardEditModal } from '../../components/CardEditModal';
import { CategoryRuleModal } from './CategoryRuleModal';
import { usePlatformSync } from './usePlatformSync';
import { useCsvImportHandlers } from './useCsvImportHandlers';
import { useSettingsNavStore } from '../../store/settingsNavSlice';

export function SettingsScreen() {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const { height: winH } = useWindowDimensions();
  const { accounts, loadAccounts, addAccount, updateBalance, updateAccount, deactivateAccount } = useAccountsStore();
  const { upsertTransactions } = useTransactionsStore();
  const { show, element: alertEl } = useAppAlert();
  const { showDupConfirm, element: dupConfirmEl } = useImportDuplicatesConfirm();
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewWrapRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const pendingScrollId = useSettingsNavStore((s) => s.pendingScrollId);
  const expandSeq = useSettingsNavStore((s) => s.expandSeq);
  const clearPendingScroll = useSettingsNavStore((s) => s.clearPendingScroll);
  const setCrumbs = useSettingsNavStore((s) => s.setCrumbs);
  const clearNav = useSettingsNavStore((s) => s.clear);
  const [prefCurrencies, setPrefCurrencies] = useState<string[]>(['USD', 'EUR', 'GBP']);
  const [homeCurrency, setHomeCurrencyState] = useState<string>('UAH');
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editRule, setEditRule] = useState<CategoryRule | null>(null);
  const [categoryRules, setCategoryRules] = useState(() => loadAllCategoryRules());

  const {
    showImportResult,
    handleZenImport,
    handleMonoCsvImport,
    handlePrivatImport,
    handleIbkrCsvImport,
  } = useCsvImportHandlers({
    accounts,
    show,
    t,
    upsertTransactions,
    addAccount,
    loadAccounts,
    showDupConfirm,
  });

  const { syncMonobank, syncIBKR, syncing, progress } = usePlatformSync({
    accounts,
    language,
    show,
    t,
    upsertTransactions,
    showImportResult,
    addAccount,
    loadAccounts,
    updateBalance,
    showDupConfirm,
  });

  useEffect(() => {
    loadAccounts();
    seedDefaultCategoryRules();
    ensureEssentialCategoryRules();
    setCategoryRules(loadAllCategoryRules());
    const prefs = loadPreferredCurrencies();
    if (prefs) setPrefCurrencies(prefs);
    const home = loadHomeCurrency();
    if (home) setHomeCurrencyState(home);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCrumbs([{ id: 'settings', label: t.tabSettings }]);
      return () => clearNav();
    }, [clearNav, setCrumbs, t.tabSettings]),
  );

  // After forced expands settle, remasure once and scroll with modest top offset (no double-pass overshoot)
  useEffect(() => {
    if (!pendingScrollId) return;

    let cancelled = false;
    const TOP_PAD = 28;

    const tryScroll = (attempt: number) => {
      if (cancelled) return;

      if (pendingScrollId === 'settings') {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        clearPendingScroll();
        return;
      }

      scrollViewWrapRef.current?.measureInWindow((_wx, wrapY) => {
        if (cancelled) return;
        const ty = useSettingsNavStore.getState().targets[pendingScrollId];
        if (ty == null) {
          if (attempt < 10) {
            setTimeout(() => tryScroll(attempt + 1), 70);
          } else {
            clearPendingScroll();
          }
          return;
        }
        // Content-relative Y is stable regardless of current scroll offset
        const relativeY = ty - wrapY;
        const nextY = Math.max(0, relativeY - TOP_PAD);
        scrollRef.current?.scrollTo({ y: nextY, animated: true });
        clearPendingScroll();
      });
    };

    const kickoff = setTimeout(() => tryScroll(0), 400);
    void expandSeq;
    void winH;
    return () => {
      cancelled = true;
      clearTimeout(kickoff);
    };
  }, [pendingScrollId, expandSeq, clearPendingScroll, winH]);

  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {alertEl}
      {dupConfirmEl}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: layout.tabBarClearance + 8 }}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View ref={scrollViewWrapRef} collapsable={false}>

        <AppearanceSection s={s} />

        <PreferencesSection
          s={s}
          prefCurrencies={prefCurrencies}
          setPrefCurrencies={setPrefCurrencies}
          homeCurrency={homeCurrency}
          setHomeCurrencyState={setHomeCurrencyState}
        />

        <PlatformsSection
          s={s}
          accounts={accounts}
          syncing={syncing}
          progress={progress}
          syncMonobank={syncMonobank}
          syncIBKR={syncIBKR}
          loadAccounts={loadAccounts}
          handleZenImport={handleZenImport}
          handleMonoCsvImport={handleMonoCsvImport}
          handlePrivatImport={handlePrivatImport}
          handleIbkrCsvImport={handleIbkrCsvImport}
        />

        <AccountsRulesSection
          s={s}
          accounts={accounts}
          categoryRules={categoryRules}
          setCategoryRules={setCategoryRules}
          setEditAccount={setEditAccount}
          setShowAddAccount={setShowAddAccount}
          setShowAddRule={setShowAddRule}
          setEditRule={setEditRule}
          deactivateAccount={deactivateAccount}
          show={show}
        />

        <DangerSection
          s={s}
          loadAccounts={loadAccounts}
          setHomeCurrencyState={setHomeCurrencyState}
          setPrefCurrencies={setPrefCurrencies}
          show={show}
        />

        <View style={s.aboutSection}>
          <Text style={s.aboutTitle}>{t.settingsAbout}</Text>
          <Text style={s.aboutText}>{t.settingsAboutLocal}</Text>
        </View>

        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <CardEditModal
        account={editAccount}
        visible={!!editAccount}
        showCurrency
        onClose={() => setEditAccount(null)}
        onSave={(name, color, currency) => {
          if (!editAccount) return;
          updateAccount(editAccount.id, {
            displayName: name,
            color,
            ...(currency ? { currency } : {}),
          });
          setEditAccount(null);
        }}
      />
      <AddAccountModal
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
        onSaved={() => setCategoryRules(loadAllCategoryRules())}
      />
    </SafeAreaView>
  );
}
