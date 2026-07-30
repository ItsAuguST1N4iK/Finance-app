import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { currencySymbol } from '../../utils/currency';
import { numberLocale } from '../../utils/locale';
import { retagAllTransactions } from '../../utils/retagTransactions';
import { refreshAppData } from '../../services/refreshAppData';
import { enqueueImportJob } from '../../services/importJobQueue';
import { useTransactionsStore } from '../../store/transactionsSlice';
import type { AlertShow } from '../../utils/importTransactions';
import {
  seedDefaultCategoryRules,
  ensureEssentialCategoryRules,
  loadAllCategoryRules,
  deleteCategoryRule,
} from '../../utils/categoryRules';
import type { CategoryRule } from '../../utils/categoryRules';
import { isScraperCategoryRule, markScraperRuleDeleted } from '../../utils/scraperCategoryRules';
import type { CategoryKey } from '../../utils/categoryRegistry';
import { CATEGORY_I18N_KEY } from '../../utils/categoryRegistry';
import { useCategoryLabels } from '../../hooks/useCategoryLabels';
import type { Account } from '../../types';
import {
  loadEditableCategories,
  deleteCategoryByKey,
  deleteCustomCategory,
  refreshCustomCategoryCache,
  type EditableCategory,
  type CategoryImpact,
} from '../../utils/categoryImpact';
import { Section } from './Section';
import { PlatformCsvPanel } from './PlatformCsvPanel';
import { CustomCategoryModal } from './CustomCategoryModal';
import type { SettingsStyles } from './settingsStyles';
import { useSettingsNavStore } from '../../store/settingsNavSlice';
import type { Translations } from '../../i18n/types';

function OutlineActionBtn({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#0a0a0a',
        borderWidth: 1.5,
        borderColor: theme.accent,
        opacity: disabled ? 0.55 : 1,
        marginBottom: 10,
      }}
    >
      <Ionicons name={icon} size={17} color={theme.accent} />
      <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function AddBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: theme.accent,
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <Ionicons name="add" size={18} color={theme.onAccent} />
      <Text style={{ color: theme.onAccent, fontSize: 14, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AccountsRulesSection({
  s,
  accounts,
  categoryRules,
  setCategoryRules,
  setEditAccount,
  setShowAddAccount,
  setShowAddRule,
  setEditRule,
  deactivateAccount,
  show,
}: {
  s: SettingsStyles;
  accounts: Account[];
  categoryRules: CategoryRule[];
  setCategoryRules: (rules: CategoryRule[]) => void;
  setEditAccount: (a: Account | null) => void;
  setShowAddAccount: (v: boolean) => void;
  setShowAddRule: (v: boolean) => void;
  setEditRule: (r: CategoryRule | null) => void;
  deactivateAccount: (id: string) => void;
  show: AlertShow;
}) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const categoryLabels = useCategoryLabels();
  const [reTagging, setReTagging] = useState(false);
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<EditableCategory | null>(null);
  const setCrumbs = useSettingsNavStore((st) => st.setCrumbs);

  const reloadCategories = useCallback(() => {
    refreshCustomCategoryCache();
    setCategories(loadEditableCategories((key) => {
      const i18nKey = CATEGORY_I18N_KEY[key] as keyof Translations;
      const fromI18n = i18nKey ? t[i18nKey] : undefined;
      return (typeof fromI18n === 'string' ? fromI18n : undefined) || categoryLabels[key] || key;
    }));
  }, [t, categoryLabels]);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  function handleDeactivate(id: string) {
    show(t.deleteAccount, t.txWillRemain, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => deactivateAccount(id) },
    ]);
  }

  function handleDeleteCategory(cat: EditableCategory) {
    show(t.settingsDeleteCategory, t.settingsDeleteCategoryConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          if (cat.isBuiltin) {
            deleteCategoryByKey(cat.key);
          } else if (cat.id) {
            deleteCustomCategory(cat.id);
          } else {
            deleteCategoryByKey(cat.key);
          }
          reloadCategories();
        },
      },
    ]);
  }

  function handleReAutoTag() {
    setReTagging(true);
    enqueueImportJob({
      label: t.appProgressRetag,
      kind: 'retag',
      run: async (onProgress) => {
        try {
          onProgress(0, 2, 'prepare');
          seedDefaultCategoryRules();
          ensureEssentialCategoryRules();
          onProgress(1, 2, 'retag');
          const result = retagAllTransactions(accounts);
          onProgress(2, 2, 'done');
          await refreshAppData('all');
          useTransactionsStore.getState().loadTransactions(
            useTransactionsStore.getState().filter,
          );
          useTransactionsStore.getState().loadRecentTransactions();

          const labels = categoryLabels;
          const breakdown = Object.entries(result.byTag)
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
            .slice(0, 8)
            .map(([key, count]) => `${labels[key as CategoryKey] ?? key}: ${count}`)
            .join('\n');

          const lockedNote = result.skippedLocked > 0
            ? `\n${t.settingsRetagSkippedLocked.replace('{locked}', String(result.skippedLocked))}`
            : '';
          const currencyNote = result.currencyFixed > 0
            ? `\n${t.settingsRetagCurrencyFixed.replace('{n}', String(result.currencyFixed))}`
            : '';

          show(
            t.done,
            t.settingsRetagSuccess
              .replace('{changed}', String(result.changed))
              .replace('{total}', String(result.total))
              .replace('{breakdown}', breakdown || '—')
              + lockedNote
              + currencyNote,
          );
        } catch (e) {
          show(t.error, String((e as Error)?.message ?? e));
          throw e;
        } finally {
          setReTagging(false);
        }
      },
    });
  }

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');
  const userRules = categoryRules.filter((r) => !isScraperCategoryRule(r));
  const autoRules = categoryRules.filter((r) => isScraperCategoryRule(r));

  const impactLabel = (imp: CategoryImpact) => {
    if (imp === 'income') return t.settingsTagImpactIncome;
    if (imp === 'fee') return t.settingsTagImpactFee;
    if (imp === 'neutral') return t.settingsTagImpactNeutral;
    return t.settingsTagImpactExpense;
  };

  const sectionTitle = t.settingsCardsAndCategories;
  const root = { id: 'settings', label: t.tabSettings };
  const section = { id: 'cards-categories', label: sectionTitle };

  function setPath(...extra: { id: string; label: string }[]) {
    setCrumbs([root, section, ...extra]);
  }

  return (
    <Section
      title={sectionTitle}
      icon="card-outline"
      crumbId="cards-categories"
      onExpandChange={(expanded) => {
        if (expanded) setPath();
        else setCrumbs([root]);
      }}
    >
      <Text style={[s.hintText, { marginBottom: 12 }]}>{t.settingsCardsAndCategoriesDesc}</Text>

      {/* Accounts */}
      <Text style={[s.hintText, { marginBottom: 6, fontSize: 12 }]}>{t.settingsAccountsListHint}</Text>
      <PlatformCsvPanel
        title={t.settingsAccountsList}
        crumbId="accounts"
        parentCrumbId="cards-categories"
        onExpandChange={(expanded) => {
          if (expanded) setPath({ id: 'accounts', label: t.settingsAccountsList });
          else setPath();
        }}
      >
        {visibleAccounts.length === 0 ? (
          <View style={[s.emptyAccounts, { marginBottom: 4 }]}>
            <Ionicons name="card-outline" size={28} color={theme.border} />
            <Text style={s.emptyAccountsText}>{t.settingsNoAccounts}</Text>
          </View>
        ) : (
          visibleAccounts.map((a) => (
            <View key={a.id} style={s.accountRow}>
              <View style={[s.accountColorDot, { backgroundColor: a.color ?? theme.accent }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{a.displayName ?? a.name}</Text>
                <Text style={s.accountMeta}>{a.platform.toUpperCase()} · {currencySymbol(a.currency)} {a.currency}</Text>
              </View>
              <View style={s.accountRight}>
                {a.balance != null && (
                  <Text style={s.accountBalance}>
                    {a.balance.toLocaleString(numberLocale(language), { maximumFractionDigits: 2 })} {currencySymbol(a.currency)} {a.currency}
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
      </PlatformCsvPanel>
      <AddBtn label={t.settingsAddAccount} onPress={() => setShowAddAccount(true)} />

      {/* Categories (merged former tags + builtins) */}
      <Text style={[s.hintText, { marginTop: 12, marginBottom: 6, fontSize: 12 }]}>{t.settingsCategoriesHint}</Text>
      <PlatformCsvPanel
        title={t.settingsCategories}
        crumbId="categories"
        parentCrumbId="cards-categories"
        onExpandChange={(expanded) => {
          if (expanded) setPath({ id: 'categories', label: t.settingsCategories });
          else setPath();
        }}
      >
        {categories.length === 0 ? (
          <Text style={[s.hintText, { marginBottom: 4 }]}>{t.settingsNoCategories}</Text>
        ) : (
          categories.map((cat) => (
            <View key={cat.key} style={[s.accountRow, { marginBottom: 6 }]}>
              <View style={[s.accountColorDot, { backgroundColor: cat.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{cat.name}</Text>
                <Text style={s.accountMeta}>
                  {impactLabel(cat.impact)}
                  {cat.isBuiltin ? ` · ${t.settingsCategoryBuiltin}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setEditCat(cat); setShowCatModal(true); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 10 }}
              >
                <Ionicons name="pencil-outline" size={16} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteCategory(cat)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={theme.expense} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </PlatformCsvPanel>
      <AddBtn
        label={t.settingsAddCategory}
        onPress={() => { setEditCat(null); setShowCatModal(true); }}
      />
      <OutlineActionBtn
        label={reTagging ? t.settingsRetagging : t.settingsReAutoTag}
        icon="refresh-outline"
        onPress={handleReAutoTag}
        disabled={reTagging}
      />

      {/* Category rules — Auto rules nested inside the same panel */}
      <Text style={[s.hintText, { marginTop: 12, marginBottom: 6, fontSize: 12 }]}>{t.settingsCategoryRulesHint}</Text>
      <PlatformCsvPanel
        title={t.settingsCategoryRules}
        crumbId="rules"
        parentCrumbId="cards-categories"
        onExpandChange={(expanded) => {
          if (expanded) setPath({ id: 'rules', label: t.settingsCategoryRules });
          else setPath();
        }}
      >
        {userRules.length === 0 ? (
          <Text style={[s.hintText, { marginBottom: 4 }]}>{t.settingsNoUserRules}</Text>
        ) : (
          userRules.map((rule) => (
            <View key={rule.id} style={[s.accountRow, { marginBottom: 6, opacity: rule.enabled ? 1 : 0.45 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{rule.name}</Text>
                <Text style={s.accountMeta}>
                  {rule.matchField} · {rule.matchOp} · {categoryLabels[rule.categoryKey as CategoryKey] ?? rule.categoryKey}
                  {' · '}{t.settingsRulePriorityShort.replace('{n}', String(rule.priority))}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setEditRule(rule); setShowAddRule(true); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 10 }}
              >
                <Ionicons name="pencil-outline" size={16} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  deleteCategoryRule(rule.id);
                  setCategoryRules(loadAllCategoryRules());
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={theme.expense} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <AddBtn label={t.settingsAddRule} onPress={() => { setEditRule(null); setShowAddRule(true); }} />

        <Text style={[s.hintText, { marginTop: 10, marginBottom: 6, fontSize: 12 }]}>{t.settingsAutoRulesHint}</Text>
        <PlatformCsvPanel
          title={t.settingsAutoRules}
          crumbId="auto-rules"
          parentCrumbId="rules"
          onExpandChange={(expanded) => {
            if (expanded) {
              setPath(
                { id: 'rules', label: t.settingsCategoryRules },
                { id: 'auto-rules', label: t.settingsAutoRules },
              );
            } else {
              setPath({ id: 'rules', label: t.settingsCategoryRules });
            }
          }}
        >
          {autoRules.length === 0 ? (
            <Text style={[s.hintText, { marginBottom: 4 }]}>{t.settingsNoAutoRules}</Text>
          ) : (
            autoRules.map((rule) => (
              <View key={rule.id} style={[s.accountRow, { marginBottom: 6, opacity: rule.enabled ? 1 : 0.45 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={s.accountName}>{rule.name}</Text>
                    <View style={{
                      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                      backgroundColor: theme.subtext + '22',
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.subtext }}>
                        {t.settingsScraperRuleBadge}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.accountMeta}>
                    {rule.matchField} · {rule.matchOp} · {categoryLabels[rule.categoryKey as CategoryKey] ?? rule.categoryKey}
                    {' · '}{t.settingsRulePriorityShort.replace('{n}', String(rule.priority))}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setEditRule(rule); setShowAddRule(true); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginRight: 10 }}
                >
                  <Ionicons name="pencil-outline" size={16} color={theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    markScraperRuleDeleted(rule.id);
                    deleteCategoryRule(rule.id);
                    setCategoryRules(loadAllCategoryRules());
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.expense} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </PlatformCsvPanel>
      </PlatformCsvPanel>

      <CustomCategoryModal
        visible={showCatModal}
        category={editCat}
        onClose={() => { setShowCatModal(false); setEditCat(null); }}
        onSaved={reloadCategories}
      />
    </Section>
  );
}
