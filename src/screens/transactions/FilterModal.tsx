import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { PressableScale } from '../../components/PressableScale';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { DatePickerModal } from '../../components/DatePickerModal';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { currencySymbol } from '../../utils/currency';
import { FILTER_CATEGORY_KEYS } from '../../utils/categoryRegistry';
import type { TransactionType, Account } from '../../types';
import { PLATFORMS, CURRENCIES, type FilterPlatform } from './types';
import { commonStyles, sectionLabelStyle } from '../../theme/commonStyles';
import { radius, space, stroke } from '../../theme/tokens';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selPlatforms: FilterPlatform[];
  setSelPlatforms: (p: FilterPlatform[]) => void;
  selTypes: TransactionType[];
  setSelTypes: (t: TransactionType[]) => void;
  selAccountId: string | null;
  setSelAccountId: (id: string | null) => void;
  accounts: Account[];
  dateFrom: Date | null;
  dateTo: Date | null;
  setDateFrom: (d: Date | null) => void;
  setDateTo: (d: Date | null) => void;
  selCurrencies: string[];
  setSelCurrencies: (c: string[]) => void;
  selCategories: string[];
  setSelCategories: (tags: string[]) => void;
  onApply: () => void;
  onReset: () => void;
  platformLabels: Record<FilterPlatform, string>;
  typeLabels: Record<TransactionType, string>;
  categoryLabels: Record<string, string>;
}

export function FilterModal({
  visible, onClose, selPlatforms, setSelPlatforms,
  selTypes, setSelTypes, selAccountId, setSelAccountId, accounts,
  dateFrom, dateTo, setDateFrom, setDateTo,
  selCurrencies, setSelCurrencies, selCategories, setSelCategories,
  onApply, onReset, platformLabels, typeLabels, categoryLabels,
}: FilterModalProps) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen,   setDateToOpen]   = useState(false);

  const eligibleAccounts = accounts.filter(
    (a) => a.id !== 'acc_default' && selPlatforms.includes(a.platform as FilterPlatform),
  );

  function togglePlatform(p: FilterPlatform) {
    const next = selPlatforms.includes(p)
      ? selPlatforms.filter((x) => x !== p)
      : [...selPlatforms, p];
    setSelPlatforms(next);
    if (next.length === 0) setSelAccountId(null);
    else if (selAccountId && !eligibleAccounts.find((a) => a.id === selAccountId)) {
      setSelAccountId(null);
    }
  }

  function toggleCategory(cat: string) {
    setSelCategories(
      selCategories.includes(cat)
        ? selCategories.filter((x) => x !== cat)
        : [...selCategories, cat],
    );
  }

  function toggleCurrency(code: string) {
    setSelCurrencies(
      selCurrencies.includes(code)
        ? selCurrencies.filter((x) => x !== code)
        : [...selCurrencies, code],
    );
  }

  void selTypes;
  void setSelTypes;
  void typeLabels;

  const activeCount = selPlatforms.length
    + (selAccountId ? 1 : 0)
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
    + selCurrencies.length + selCategories.length;

  return (
    <>
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={t.txFilters}
      scroll
      footer={(
        <View style={commonStyles.sheetFooterRow}>
          <PressableScale
            style={[commonStyles.footerBtnGhost, { borderColor: theme.border }]}
            onPress={onReset}
          >
            <Text style={[commonStyles.footerBtnText, { color: theme.subtext }]}>{t.reset}</Text>
          </PressableScale>
          <PressableScale
            style={[commonStyles.footerBtnPrimary, { backgroundColor: theme.accent }]}
            onPress={() => { onApply(); onClose(); }}
          >
            <Text style={[commonStyles.footerBtnTextPrimary, { color: theme.onAccent }]}>
              {t.apply}{activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </PressableScale>
        </View>
      )}
    >
            {/* Platforms */}
            <Text style={sectionLabelStyle(theme.subtext)}>{t.txPlatforms}</Text>
            <View style={fStyles.chipsSection}>
              {PLATFORMS.map((p) => {
                const active = selPlatforms.includes(p);
                return (
                  <PressableScale key={p}
                    feedback="opacity"
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => togglePlatform(p)}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>{platformLabels[p]}</Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </PressableScale>
                );
              })}
            </View>

            {selPlatforms.length > 0 && (
              <>
                <Text style={[sectionLabelStyle(theme.subtext), { marginTop: 16 }]}>
                  {t.txFilterAccounts}
                </Text>
                <View style={fStyles.chipsSection}>
                  <PressableScale
                    feedback="opacity"
                    style={[fStyles.optionChip, {
                      backgroundColor: !selAccountId ? theme.accent + '22' : theme.cardAlt,
                      borderColor: !selAccountId ? theme.accent : theme.border,
                    }]}
                    onPress={() => setSelAccountId(null)}
                  >
                    <Text style={[fStyles.optionText, { color: !selAccountId ? theme.accent : theme.subtext }]}>
                      {t.txFilterAll}
                    </Text>
                    {!selAccountId && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </PressableScale>
                  {eligibleAccounts.map((acc) => {
                    const active = selAccountId === acc.id;
                    return (
                      <PressableScale
                        key={acc.id}
                        feedback="opacity"
                        style={[fStyles.optionChip, {
                          backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                          borderColor: active ? theme.accent : theme.border,
                        }]}
                        onPress={() => setSelAccountId(active ? null : acc.id)}
                      >
                        <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]} numberOfLines={1}>
                          {acc.displayName ?? acc.name}
                        </Text>
                        {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                      </PressableScale>
                    );
                  })}
                </View>
              </>
            )}

            {/* Categories — multi-select */}
            <Text style={[sectionLabelStyle(theme.subtext), { marginTop: 16 }]}>{t.tagSearch}</Text>
            <View style={fStyles.chipsSection}>
              {FILTER_CATEGORY_KEYS.map((cat) => {
                const active = selCategories.includes(cat);
                return (
                  <PressableScale key={cat}
                    feedback="opacity"
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>{categoryLabels[cat] ?? cat}</Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </PressableScale>
                );
              })}
            </View>

            {/* Date range */}
            <Text style={[sectionLabelStyle(theme.subtext), { marginTop: 16 }]}>
              {t.txDateFrom} / {t.txDateTo}
            </Text>
            <View style={fStyles.dateRow}>
              <PressableScale
                style={[fStyles.datePicker, { backgroundColor: dateFrom ? theme.accent + '22' : theme.cardAlt, borderColor: dateFrom ? theme.accent : theme.border, flex: 1 }]}
                onPress={() => setDateFromOpen(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={dateFrom ? theme.accent : theme.subtext} />
                <Text style={[fStyles.dateText, { color: dateFrom ? theme.accent : theme.subtext }]}>
                  {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : t.txDateFrom}
                </Text>
                {dateFrom && (
                  <PressableScale onPress={() => setDateFrom(null)} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <Ionicons name="close" size={13} color={theme.accent} />
                  </PressableScale>
                )}
              </PressableScale>
              <Text style={[fStyles.dateSep, { color: theme.subtext }]}>→</Text>
              <PressableScale
                style={[fStyles.datePicker, {
                  backgroundColor: dateTo ? theme.accent + '22' : theme.cardAlt,
                  borderColor: dateTo ? theme.accent : theme.border,
                  flex: 1,
                }]}
                onPress={() => setDateToOpen(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={dateTo ? theme.accent : theme.subtext} />
                <Text style={[fStyles.dateText, { color: dateTo ? theme.accent : theme.subtext }]}>
                  {dateTo ? format(dateTo, 'dd.MM.yyyy') : t.txDateTo}
                </Text>
                {dateTo && (
                  <PressableScale onPress={() => setDateTo(null)} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <Ionicons name="close" size={13} color={theme.accent} />
                  </PressableScale>
                )}
              </PressableScale>
            </View>

            {/* Currency — multi-select */}
            <Text style={[sectionLabelStyle(theme.subtext), { marginTop: 16 }]}>{t.txCurrency}</Text>
            <View style={fStyles.chipsSection}>
              {CURRENCIES.map((code) => {
                const active = selCurrencies.includes(code);
                return (
                  <PressableScale key={code}
                    feedback="opacity"
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => toggleCurrency(code)}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>
                      {currencySymbol(code)} {code}
                    </Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </PressableScale>
                );
              })}
            </View>
    </BottomSheetModal>

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
    </>
  );
}

const fStyles = StyleSheet.create({
  chipsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[2] },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: 7,
    borderWidth: stroke.width, gap: 6,
  },
  optionText: { fontSize: 13, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: 4 },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.md, paddingHorizontal: space[2.5], paddingVertical: space[2],
    borderWidth: stroke.width,
  },
  dateText: { fontSize: 13, flex: 1 },
  dateSep: { fontSize: 16, fontWeight: '600' },
});
