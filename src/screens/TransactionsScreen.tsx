import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Modal,
  TextInput, TouchableOpacity, ScrollView, LayoutAnimation,
  Platform, UIManager, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useAccountsStore }      from '../store/accountsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DatePickerModal } from '../components/DatePickerModal';
import type { UnifiedTransaction, Platform as Plat, TransactionType } from '../types';
import { currencySymbol } from '../utils/currency';
import { ALL_TAGS, TagType } from '../utils/tags';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLATFORMS: Plat[]        = ['monobank', 'ibkr', 'privatbank', 'zen', 'manual'];
const TYPES: TransactionType[] = ['income', 'expense', 'transfer', 'fee'];
const CURRENCIES               = ['UAH', 'USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK', 'CAD', 'AUD', 'JPY'];

// ─── Tag helpers ──────────────────────────────────────

function useTagLabels() {
  const { t } = useLanguage();
  const labels: Record<string, string> = {
    entertainment: t.tagEntertainment,
    utilities:     t.tagUtilities,
    electronics:   t.tagElectronics,
    self_transfer: t.tagSelfTransfer,
    transfer:      t.tagTransfer,
    top_up:        t.tagTopUp,
  };
  return labels;
}

// ─── Transaction Detail Modal ─────────────────────────

function TxDetailModal({
  item,
  visible,
  onClose,
}: {
  item: UnifiedTransaction | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { updateTransactionTag } = useTransactionsStore();
  const { accounts } = useAccountsStore();
  const tagLabels = useTagLabels();

  const [showTagPicker, setShowTagPicker] = useState(false);

  if (!item) return null;

  const tx = item;

  const sign      = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const amtColor  = tx.type === 'income' ? theme.income : tx.type === 'expense' ? theme.expense : theme.subtext;
  const account   = accounts.find((a) => a.id === tx.accountId);
  const accountLabel = account ? (account.displayName ?? account.name) : tx.accountId;

  function handleTagSelect(tag: TagType | null) {
    updateTransactionTag(tx.id, tag);
    setShowTagPicker(false);
  }

  const tagLabel = tx.tag ? (tagLabels[tx.tag] ?? tx.tag) : t.tagNoTag;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={[dtStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[dtStyles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={dtStyles.header}>
            <Text style={[dtStyles.title, { color: theme.text }]}>{t.txDetail}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount */}
            <View style={[dtStyles.amountBox, { backgroundColor: amtColor + '18', borderColor: amtColor + '44' }]}>
              <Text style={[dtStyles.amount, { color: amtColor }]}>
                {sign}{Math.abs(tx.amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
              </Text>
              <Text style={[dtStyles.currency, { color: amtColor }]}>
                {currencySymbol(tx.currency)} {tx.currency}
              </Text>
            </View>

            {/* Description */}
            {tx.description && (
              <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
                <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>Опис</Text>
                <Text style={[dtStyles.rowValue, { color: theme.text }]}>{tx.description}</Text>
              </View>
            )}

            {/* Account */}
            <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
              <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>{t.txAccount}</Text>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={[dtStyles.rowValue, { color: theme.text }]}>{accountLabel}</Text>
                {account?.name && account.name !== accountLabel && (
                  <Text style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>{account.name}</Text>
                )}
                {account?.iban && (
                  <Text style={{ fontSize: 10, color: theme.subtext, marginTop: 1 }}>{account.iban}</Text>
                )}
              </View>
            </View>

            {/* Date & time */}
            <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
              <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>{t.txExactDate}</Text>
              <Text style={[dtStyles.rowValue, { color: theme.text }]}>
                {format(tx.transactionDate, 'd MMMM yyyy, HH:mm', { locale: uk })}
              </Text>
            </View>

            {/* Platform */}
            <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
              <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>Платформа</Text>
              <Text style={[dtStyles.rowValue, { color: theme.accent }]}>{tx.platform}</Text>
            </View>

            {/* Type */}
            <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
              <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>Тип</Text>
              <Text style={[dtStyles.rowValue, { color: amtColor }]}>{tx.type}</Text>
            </View>

            {/* Fee */}
            {tx.feeAmount > 0 && (
              <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
                <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>{t.txFee}</Text>
                <Text style={[dtStyles.rowValue, { color: theme.warning }]}>
                  {tx.feeAmount.toLocaleString('uk-UA')} {tx.feeCurrency ?? tx.currency}
                </Text>
              </View>
            )}

            {/* Counterparty */}
            {tx.counterparty && (
              <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
                <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>Контрагент</Text>
                <Text style={[dtStyles.rowValue, { color: theme.text }]}>{tx.counterparty}</Text>
              </View>
            )}

            {/* MCC */}
            {tx.mcc != null && (
              <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
                <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>{t.txMcc}</Text>
                <Text style={[dtStyles.rowValue, { color: theme.subtext }]}>{tx.mcc}</Text>
              </View>
            )}

            {/* Tag row — editable */}
            <View style={[dtStyles.row, { borderBottomColor: theme.border }]}>
              <Text style={[dtStyles.rowLabel, { color: theme.subtext }]}>{t.tagLabel}</Text>
              <TouchableOpacity
                style={[dtStyles.tagChip, {
                  backgroundColor: tx.tag ? theme.accent + '22' : theme.cardAlt,
                  borderColor: tx.tag ? theme.accent : theme.border,
                }]}
                onPress={() => setShowTagPicker(true)}
                activeOpacity={0.75}
              >
                <Text style={[dtStyles.tagChipText, { color: tx.tag ? theme.accent : theme.subtext }]}>
                  {tagLabel}
                </Text>
                <Ionicons name="pencil-outline" size={12} color={tx.tag ? theme.accent : theme.subtext} />
              </TouchableOpacity>
            </View>

            {/* Tag picker */}
            {showTagPicker && (
              <View style={[dtStyles.tagPickerBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[dtStyles.tagOption, { borderColor: theme.border }, !tx.tag && { backgroundColor: theme.accent + '22' }]}
                  onPress={() => handleTagSelect(null)}
                  activeOpacity={0.75}
                >
                  <Text style={[dtStyles.tagOptionText, { color: !tx.tag ? theme.accent : theme.subtext }]}>
                    {t.tagNoTag}
                  </Text>
                </TouchableOpacity>
                {ALL_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[dtStyles.tagOption, { borderColor: theme.border }, tx.tag === tag && { backgroundColor: theme.accent + '22' }]}
                    onPress={() => handleTagSelect(tag)}
                    activeOpacity={0.75}
                  >
                    <Text style={[dtStyles.tagOptionText, { color: tx.tag === tag ? theme.accent : theme.text }]}>
                      {tagLabels[tag] ?? tag}
                    </Text>
                    {tx.tag === tag && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const dtStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet:   {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, padding: 20, maxHeight: '85%',
  },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '700' },
  amountBox: {
    borderRadius: 14, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'baseline', gap: 6,
    borderWidth: 1,
  },
  amount:   { fontSize: 28, fontWeight: '800' },
  currency: { fontSize: 16, fontWeight: '600' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, gap: 12,
  },
  rowLabel: { fontSize: 13, minWidth: 90 },
  rowValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  tagChipText: { fontSize: 13, fontWeight: '500' },
  tagPickerBox: {
    borderRadius: 12, borderWidth: 1, padding: 8,
    marginTop: 4, marginBottom: 8, gap: 2,
  },
  tagOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, marginBottom: 4,
  },
  tagOptionText: { fontSize: 13 },
});

// ─── Date Separator ──────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={sepStyles.row}>
      <View style={[sepStyles.line, { backgroundColor: theme.border }]} />
      <Text style={[sepStyles.label, { color: theme.subtext, backgroundColor: theme.bg }]}>{label}</Text>
      <View style={[sepStyles.line, { backgroundColor: theme.border }]} />
    </View>
  );
}

const sepStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 16 },
  line:  { flex: 1, height: 1 },
  label: { fontSize: 11, fontWeight: '600', paddingHorizontal: 10, textAlign: 'center' },
});

// ─── Transaction Item ─────────────────────────────────

function TxItem({
  item, tagLabels, accountColor, accountName, onPress,
}: {
  item: UnifiedTransaction;
  tagLabels: Record<string, string>;
  accountColor: string;
  accountName: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const isCancellation = /^Cancellation\./i.test(item.description ?? '');
  const sign     = item.type === 'income' ? '+' : item.type === 'expense' ? '−' : '';
  const amtColor = item.type === 'income' ? theme.income : item.type === 'expense' ? theme.expense : theme.subtext;
  const sym      = currencySymbol(item.currency);

  return (
    <TouchableOpacity
      style={[styles.txItem, { borderBottomColor: theme.border, opacity: isCancellation ? 0.6 : 1 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Account color left bar */}
      <View style={[styles.txColorBar, { backgroundColor: accountColor }]} />
      <View style={styles.txLeft}>
        <Text style={[styles.txDesc, { color: theme.text }]} numberOfLines={1}>
          {item.description ?? item.category ?? t.txTransaction}
        </Text>
        <View style={styles.txMeta}>
          <Text style={[styles.txPlatform, { color: accountColor }]}>{accountName}</Text>
          <Text style={[styles.txDot, { color: theme.subtext }]}> · </Text>
          <Text style={[styles.txDate, { color: theme.subtext }]}>
            {format(item.transactionDate, 'd MMM, HH:mm', { locale: uk })}
          </Text>
          {item.tag && (
            <>
              <Text style={[styles.txDot, { color: theme.subtext }]}> · </Text>
              <Text style={[styles.txTag, { color: theme.accent }]}>
                {tagLabels[item.tag] ?? item.tag}
              </Text>
            </>
          )}
          {item.feeAmount > 0 && (
            <>
              <Text style={[styles.txDot, { color: theme.subtext }]}> · </Text>
              <Text style={[styles.txFee, { color: theme.warning }]}>
                {t.txFee} {item.feeAmount.toLocaleString('uk-UA')} {item.feeCurrency ?? item.currency}
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.txAmountCol}>
        <Text style={[styles.txAmount, { color: amtColor }]}>
          {sign}{Math.abs(item.amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} {sym}
        </Text>
        {item.currency !== 'UAH' && (
          <Text style={[styles.txCurrency, { color: theme.subtext }]}>{item.currency}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Chip ──────────────────────────────────────

interface ChipProps { label: string; onRemove: () => void; }

function FilterChip({ label, onRemove }: ChipProps) {
  const { theme } = useTheme();
  return (
    <View style={[chipStyles.chip, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '66' }]}>
      <Text style={[chipStyles.label, { color: theme.accent }]} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }} activeOpacity={0.75}>
        <Ionicons name="close" size={13} color={theme.accent} />
      </TouchableOpacity>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, gap: 5, flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: '600' },
});

// ─── Island Filter Bar ────────────────────────────────

interface FilterBarProps {
  selPlatforms: Plat[];
  setSelPlatforms: (p: Plat[]) => void;
  selTypes: TransactionType[];
  setSelTypes: (t: TransactionType[]) => void;
  dateFrom: Date | null;
  dateTo: Date | null;
  setDateFrom: (d: Date | null) => void;
  setDateTo: (d: Date | null) => void;
  selCurrency: string | null;
  setSelCurrency: (c: string | null) => void;
  selTag: string | null;
  setSelTag: (tag: string | null) => void;
  platformLabels: Record<Plat, string>;
  typeLabels: Record<TransactionType, string>;
  tagLabels: Record<string, string>;
  onOpenFilters: () => void;
}

function FilterBar({
  selPlatforms, setSelPlatforms, selTypes, setSelTypes,
  dateFrom, dateTo, setDateFrom, setDateTo,
  selCurrency, setSelCurrency,
  selTag, setSelTag,
  platformLabels, typeLabels, tagLabels, onOpenFilters,
}: FilterBarProps) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const allChips: Array<{ id: string; label: string; onRemove: () => void }> = [
    ...selPlatforms.map((p) => ({
      id: `p-${p}`, label: platformLabels[p],
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelPlatforms(selPlatforms.filter((x) => x !== p));
      },
    })),
    ...selTypes.map((ty) => ({
      id: `t-${ty}`, label: typeLabels[ty],
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelTypes(selTypes.filter((x) => x !== ty));
      },
    })),
    ...(selTag ? [{
      id: 'tag',
      label: `🏷 ${tagLabels[selTag] ?? selTag}`,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelTag(null);
      },
    }] : []),
    ...(dateFrom ? [{
      id: 'date-from',
      label: `${t.txDateFrom}: ${format(dateFrom, 'dd.MM.yy')}`,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDateFrom(null);
        setDateTo(null); // Linked: clearing From also clears To
      },
    }] : []),
    ...(dateTo ? [{
      id: 'date-to',
      label: `${t.txDateTo}: ${format(dateTo, 'dd.MM.yy')}`,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDateTo(null);
      },
    }] : []),
    ...(selCurrency ? [{
      id: 'currency',
      label: `${currencySymbol(selCurrency)} ${selCurrency}`,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelCurrency(null);
      },
    }] : []),
  ];

  const MAX_VISIBLE_ROWS = 2;
  const CHIPS_PER_ROW    = 3;
  const maxVisible       = MAX_VISIBLE_ROWS * CHIPS_PER_ROW;
  const hasOverflow      = allChips.length > maxVisible;
  const visibleChips     = expanded ? allChips : allChips.slice(0, maxVisible);
  const hasAny           = allChips.length > 0;

  if (!hasAny) return null;

  return (
    <View style={[fbStyles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={fbStyles.chipsWrap}>
        {visibleChips.map((chip) => (
          <FilterChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
        ))}
      </View>
      {hasOverflow && (
        <TouchableOpacity
          style={fbStyles.expandRow}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpanded((v) => !v);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subtext} />
          <View style={[fbStyles.expandSep, { backgroundColor: theme.border }]} />
          <Text style={[fbStyles.expandText, { color: theme.subtext }]}>
            {expanded ? t.txCollapseFilters : `${t.txExpandFilters} (${allChips.length - maxVisible})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const fbStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, borderWidth: 1, padding: 10, gap: 8,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  expandSep: { flex: 1, height: 1 },
  expandText: { fontSize: 12, fontWeight: '600' },
});

// ─── Filter Panel Modal ───────────────────────────────

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selPlatforms: Plat[];
  setSelPlatforms: (p: Plat[]) => void;
  selTypes: TransactionType[];
  setSelTypes: (t: TransactionType[]) => void;
  dateFrom: Date | null;
  dateTo: Date | null;
  setDateFrom: (d: Date | null) => void;
  setDateTo: (d: Date | null) => void;
  selCurrency: string | null;
  setSelCurrency: (c: string | null) => void;
  selTag: string | null;
  setSelTag: (tag: string | null) => void;
  onApply: () => void;
  onReset: () => void;
  platformLabels: Record<Plat, string>;
  typeLabels: Record<TransactionType, string>;
  tagLabels: Record<string, string>;
}

function FilterModal({
  visible, onClose, selPlatforms, setSelPlatforms,
  selTypes, setSelTypes, dateFrom, dateTo, setDateFrom, setDateTo,
  selCurrency, setSelCurrency, selTag, setSelTag,
  onApply, onReset, platformLabels, typeLabels, tagLabels,
}: FilterModalProps) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen,   setDateToOpen]   = useState(false);

  const dateRangeLinked = !!(dateFrom || dateTo);

  function togglePlatform(p: Plat) {
    setSelPlatforms(selPlatforms.includes(p) ? selPlatforms.filter((x) => x !== p) : [...selPlatforms, p]);
  }
  function toggleType(ty: TransactionType) {
    setSelTypes(selTypes.includes(ty) ? selTypes.filter((x) => x !== ty) : [...selTypes, ty]);
  }
  function clearDateRange() {
    setDateFrom(null);
    setDateTo(null);
  }

  const activeCount = selPlatforms.length + selTypes.length
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (selCurrency ? 1 : 0) + (selTag ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={[fStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[fStyles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>

          <View style={fStyles.header}>
            <Text style={[fStyles.title, { color: theme.text }]}>{t.txFilters}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Platforms */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext }]}>{t.txPlatforms}</Text>
            <View style={fStyles.chipsSection}>
              {PLATFORMS.map((p) => {
                const active = selPlatforms.includes(p);
                return (
                  <TouchableOpacity key={p}
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => togglePlatform(p)} activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>{platformLabels[p]}</Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Types */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>{t.txTypes}</Text>
            <View style={fStyles.chipsSection}>
              {TYPES.map((ty) => {
                const active = selTypes.includes(ty);
                return (
                  <TouchableOpacity key={ty}
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => toggleType(ty)} activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>{typeLabels[ty]}</Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tags */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>{t.tagSearch}</Text>
            <View style={fStyles.chipsSection}>
              {ALL_TAGS.map((tag) => {
                const active = selTag === tag;
                return (
                  <TouchableOpacity key={tag}
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => setSelTag(active ? null : tag)} activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>{tagLabels[tag] ?? tag}</Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date range — linked filters */}
            <View style={[fStyles.dateRangeHeader, { marginTop: 16 }]}>
              <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 0 }]}>{t.txDateFrom} / {t.txDateTo}</Text>
              {dateRangeLinked && (
                <View style={[fStyles.linkedBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                  <Ionicons name="link-outline" size={11} color={theme.accent} />
                  <Text style={[fStyles.linkedText, { color: theme.accent }]}>Пов'язані</Text>
                  <TouchableOpacity onPress={clearDateRange} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <Ionicons name="close" size={11} color={theme.accent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={fStyles.dateRow}>
              <TouchableOpacity
                style={[fStyles.datePicker, { backgroundColor: dateFrom ? theme.accent + '22' : theme.cardAlt, borderColor: dateFrom ? theme.accent : theme.border, flex: 1 }]}
                onPress={() => setDateFromOpen(true)} activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={14} color={dateFrom ? theme.accent : theme.subtext} />
                <Text style={[fStyles.dateText, { color: dateFrom ? theme.accent : theme.subtext }]}>
                  {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : t.txDateFrom}
                </Text>
                {dateFrom && (
                  <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <Ionicons name="close" size={13} color={theme.accent} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <Text style={[fStyles.dateSep, { color: dateRangeLinked ? theme.accent : theme.subtext, opacity: dateRangeLinked ? 1 : 0.5 }]}>→</Text>
              <TouchableOpacity
                style={[fStyles.datePicker, {
                  backgroundColor: dateTo ? theme.accent + '22' : (dateFrom ? theme.cardAlt : theme.cardAlt + '88'),
                  borderColor: dateTo ? theme.accent : (dateFrom ? theme.border : theme.border + '44'),
                  flex: 1, opacity: dateFrom ? 1 : 0.5,
                }]}
                onPress={() => { if (dateFrom) setDateToOpen(true); }} activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={14} color={dateTo ? theme.accent : theme.subtext} />
                <Text style={[fStyles.dateText, { color: dateTo ? theme.accent : theme.subtext }]}>
                  {dateTo ? format(dateTo, 'dd.MM.yyyy') : t.txDateTo}
                </Text>
                {dateTo && (
                  <TouchableOpacity onPress={() => setDateTo(null)} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <Ionicons name="close" size={13} color={theme.accent} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
            {!dateFrom && (
              <Text style={[fStyles.linkedHint, { color: theme.subtext }]}>
                Оберіть дату "Від" щоб розблокувати дату "До"
              </Text>
            )}

            {/* Currency */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>{t.txCurrency}</Text>
            <View style={fStyles.chipsSection}>
              {CURRENCIES.map((code) => {
                const active = selCurrency === code;
                return (
                  <TouchableOpacity key={code}
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => setSelCurrency(active ? null : code)} activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>
                      {currencySymbol(code)} {code}
                    </Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={fStyles.footer}>
            <TouchableOpacity style={[fStyles.resetBtn, { borderColor: theme.border }]} onPress={onReset} activeOpacity={0.75}>
              <Text style={[fStyles.resetBtnText, { color: theme.subtext }]}>{t.reset}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[fStyles.applyBtn, { backgroundColor: theme.accent }]}
              onPress={() => { onApply(); onClose(); }} activeOpacity={0.75}
            >
              <Text style={fStyles.applyBtnText}>
                {t.apply}{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={dateFromOpen}
        value={dateFrom}
        title={t.txDateFrom}
        maxDate={dateTo ?? undefined}
        onClose={() => setDateFromOpen(false)}
        onConfirm={(d) => { setDateFrom(d); setDateFromOpen(false); }}
      />
      <DatePickerModal
        visible={dateToOpen}
        value={dateTo}
        title={t.txDateTo}
        minDate={dateFrom ?? undefined}
        onClose={() => setDateToOpen(false)}
        onConfirm={(d) => { setDateTo(d); setDateToOpen(false); }}
      />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fStyles = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, padding: 20, maxHeight: '85%',
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:      { fontSize: 18, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  chipsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, gap: 6,
  },
  optionText: { fontSize: 13, fontWeight: '500' },
  dateRangeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  linkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  linkedText:  { fontSize: 11, fontWeight: '600' },
  linkedHint:  { fontSize: 11, marginTop: 4, marginBottom: 8 },
  dateRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1,
  },
  dateText:  { fontSize: 13, flex: 1 },
  dateSep:   { fontSize: 16, fontWeight: '600' },
  footer:     { flexDirection: 'row', gap: 10, marginTop: 20 },
  resetBtn:   { flex: 1, borderRadius: 10, borderWidth: 1, padding: 13, alignItems: 'center' },
  resetBtnText: { fontSize: 15, fontWeight: '600' },
  applyBtn:   { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────

export function TransactionsScreen() {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { transactions, loadTransactions } = useTransactionsStore();
  const { accounts, loadAccounts } = useAccountsStore();
  const tagLabels = useTagLabels();

  const [search,        setSearch]        = useState('');
  const [selPlatforms,  setSelPlatforms]  = useState<Plat[]>([]);
  const [selTypes,      setSelTypes]      = useState<TransactionType[]>([]);
  const [dateFrom,      setDateFrom]      = useState<Date | null>(null);
  const [dateTo,        setDateTo]        = useState<Date | null>(null);
  const [selCurrency,   setSelCurrency]   = useState<string | null>(null);
  const [selTag,        setSelTag]        = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [detailTx,      setDetailTx]      = useState<UnifiedTransaction | null>(null);

  const platformLabels: Record<Plat, string> = {
    monobank: t.platformMonobank, ibkr: t.platformIbkr,
    privatbank: t.platformPrivatbank, zen: t.platformZen, manual: t.platformManual,
  };
  const typeLabels: Record<TransactionType, string> = {
    income: t.typeIncome, expense: t.typeExpense, transfer: t.typeTransfer, fee: t.typeFee,
  };

  useEffect(() => {
    loadTransactions();
    loadAccounts();
  }, []);

  // Clear dateTo when dateFrom is cleared (linked filters)
  useEffect(() => {
    if (!dateFrom && dateTo) setDateTo(null);
  }, [dateFrom]);

  useEffect(() => {
    const timer = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      loadTransactions({
        platforms:  selPlatforms,
        types:      selTypes,
        searchText: search || undefined,
        dateFrom:   dateFrom ? dateFrom.getTime() : undefined,
        dateTo:     dateTo   ? dateTo.getTime()   : undefined,
        currency:   selCurrency ?? undefined,
        tag:        selTag ?? undefined,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, selPlatforms, selTypes, dateFrom, dateTo, selCurrency, selTag]);

  function applyFilters() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    loadTransactions({
      platforms: selPlatforms, types: selTypes, searchText: search || undefined,
      dateFrom: dateFrom ? dateFrom.getTime() : undefined,
      dateTo:   dateTo   ? dateTo.getTime()   : undefined,
      currency: selCurrency ?? undefined,
      tag:      selTag ?? undefined,
    });
  }

  function resetFilters() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelPlatforms([]); setSelTypes([]); setDateFrom(null); setDateTo(null);
    setSelCurrency(null); setSelTag(null);
  }

  const activeFilters = selPlatforms.length + selTypes.length
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (selCurrency ? 1 : 0) + (selTag ? 1 : 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      {/* Search + Filter row */}
      <View style={styles.topRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.card }]}>
          <Ionicons name="search-outline" size={18} color={theme.subtext} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t.txSearch}
            placeholderTextColor={theme.subtext}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.75}>
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: activeFilters > 0 ? theme.accent : theme.card }]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="options-outline" size={20} color={activeFilters > 0 ? '#fff' : theme.subtext} />
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      <FilterBar
        selPlatforms={selPlatforms}
        setSelPlatforms={setSelPlatforms}
        selTypes={selTypes}
        setSelTypes={setSelTypes}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        selCurrency={selCurrency}
        setSelCurrency={setSelCurrency}
        selTag={selTag}
        setSelTag={setSelTag}
        platformLabels={platformLabels}
        typeLabels={typeLabels}
        tagLabels={tagLabels}
        onOpenFilters={() => setFilterVisible(true)}
      />

      <Text style={[styles.countText, { color: theme.subtext }]}>
        {transactions.length} {t.txCount}
      </Text>

      {/* Build display list with date separators */}
      {(() => {
        // Precompute account lookup
        const accountMap = new Map(accounts.map((a) => [a.id, a]));

        type DisplayItem =
          | { kind: 'sep'; label: string; key: string }
          | { kind: 'tx'; data: UnifiedTransaction };

        const displayItems: DisplayItem[] = [];
        let lastDate = '';
        for (const tx of transactions) {
          const label = format(tx.transactionDate, 'd MMMM yyyy', { locale: uk });
          if (label !== lastDate) {
            displayItems.push({ kind: 'sep', label, key: `sep_${label}` });
            lastDate = label;
          }
          displayItems.push({ kind: 'tx', data: tx });
        }

        return (
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.kind === 'sep' ? item.key : item.data.id}
            renderItem={({ item }) => {
              if (item.kind === 'sep') return <DateSeparator label={item.label} />;
              const acc  = accountMap.get(item.data.accountId);
              const col  = acc?.color ?? theme.accent;
              const name = acc ? (acc.displayName ?? acc.name) : item.data.platform;
              return (
                <TxItem
                  item={item.data}
                  tagLabels={tagLabels}
                  accountColor={col}
                  accountName={name}
                  onPress={() => setDetailTx(item.data)}
                />
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.subtext }]}>{t.txNoResults}</Text>
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          />
        );
      })()}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selPlatforms={selPlatforms}
        setSelPlatforms={setSelPlatforms}
        selTypes={selTypes}
        setSelTypes={setSelTypes}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        selCurrency={selCurrency}
        setSelCurrency={setSelCurrency}
        selTag={selTag}
        setSelTag={setSelTag}
        onApply={applyFilters}
        onReset={resetFilters}
        platformLabels={platformLabels}
        typeLabels={typeLabels}
        tagLabels={tagLabels}
      />

      {/* Transaction detail modal */}
      <TxDetailModal
        item={detailTx}
        visible={!!detailTx}
        onClose={() => setDetailTx(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#fff', borderRadius: 6, width: 14, height: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#000' },
  countText: { fontSize: 12, marginLeft: 16, marginBottom: 6 },
  txItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  txColorBar:  { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: 10, minHeight: 36 },
  txLeft:      { flex: 1, marginRight: 8 },
  txDesc:      { fontSize: 14, marginBottom: 4, fontWeight: '500' },
  txMeta:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  txPlatform:  { fontSize: 11, fontWeight: '600' },
  txDot:       { fontSize: 11 },
  txDate:      { fontSize: 11 },
  txTag:       { fontSize: 11, fontWeight: '500' },
  txFee:       { fontSize: 11 },
  txAmountCol: { alignItems: 'flex-end', paddingRight: 4 },
  txAmount:    { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  txCurrency:  { fontSize: 11, fontWeight: '400' },
  emptyText:   { textAlign: 'center', paddingVertical: 40 },
});
