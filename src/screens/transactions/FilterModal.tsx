import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { DatePickerModal } from '../../components/DatePickerModal';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { currencySymbol } from '../../utils/currency';
import { FILTER_CATEGORY_KEYS } from '../../utils/categoryRegistry';
import type { TransactionType, Account } from '../../types';
import { PLATFORMS, CURRENCIES, type FilterPlatform } from './types';

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
      maxHeight="88%"
      footer={(
        <View style={fStyles.footer}>
          <TouchableOpacity style={[fStyles.resetBtn, { borderColor: theme.border }]} onPress={onReset} activeOpacity={0.75}>
            <Text style={[fStyles.resetBtnText, { color: theme.subtext }]}>{t.reset}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[fStyles.applyBtn, { backgroundColor: theme.accent }]}
            onPress={() => { onApply(); onClose(); }} activeOpacity={0.75}
          >
            <Text style={[fStyles.applyBtnText, { color: theme.onAccent }]}>
              {t.apply}{activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    >
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

            {selPlatforms.length > 0 && (
              <>
                <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>
                  {t.txFilterAccounts}
                </Text>
                <View style={fStyles.chipsSection}>
                  <TouchableOpacity
                    style={[fStyles.optionChip, {
                      backgroundColor: !selAccountId ? theme.accent + '22' : theme.cardAlt,
                      borderColor: !selAccountId ? theme.accent : theme.border,
                    }]}
                    onPress={() => setSelAccountId(null)}
                    activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: !selAccountId ? theme.accent : theme.subtext }]}>
                      {t.txFilterAll}
                    </Text>
                    {!selAccountId && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                  {eligibleAccounts.map((acc) => {
                    const active = selAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[fStyles.optionChip, {
                          backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                          borderColor: active ? theme.accent : theme.border,
                        }]}
                        onPress={() => setSelAccountId(active ? null : acc.id)}
                        activeOpacity={0.75}
                      >
                        <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]} numberOfLines={1}>
                          {acc.displayName ?? acc.name}
                        </Text>
                        {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Categories — multi-select */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>{t.tagSearch}</Text>
            <View style={fStyles.chipsSection}>
              {FILTER_CATEGORY_KEYS.map((cat) => {
                const active = selCategories.includes(cat);
                return (
                  <TouchableOpacity key={cat}
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => toggleCategory(cat)} activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>{categoryLabels[cat] ?? cat}</Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date range */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>
              {t.txDateFrom} / {t.txDateTo}
            </Text>
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
                  <TouchableOpacity onPress={() => setDateFrom(null)} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <Ionicons name="close" size={13} color={theme.accent} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <Text style={[fStyles.dateSep, { color: theme.subtext }]}>→</Text>
              <TouchableOpacity
                style={[fStyles.datePicker, {
                  backgroundColor: dateTo ? theme.accent + '22' : theme.cardAlt,
                  borderColor: dateTo ? theme.accent : theme.border,
                  flex: 1,
                }]}
                onPress={() => setDateToOpen(true)} activeOpacity={0.75}
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

            {/* Currency — multi-select */}
            <Text style={[fStyles.sectionLabel, { color: theme.subtext, marginTop: 16 }]}>{t.txCurrency}</Text>
            <View style={fStyles.chipsSection}>
              {CURRENCIES.map((code) => {
                const active = selCurrencies.includes(code);
                return (
                  <TouchableOpacity key={code}
                    style={[fStyles.optionChip, { backgroundColor: active ? theme.accent + '22' : theme.cardAlt, borderColor: active ? theme.accent : theme.border }]}
                    onPress={() => toggleCurrency(code)} activeOpacity={0.75}
                  >
                    <Text style={[fStyles.optionText, { color: active ? theme.accent : theme.subtext }]}>
                      {currencySymbol(code)} {code}
                    </Text>
                    {active && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                  </TouchableOpacity>
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
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10,
  },
  chipsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, gap: 6,
  },
  optionText: { fontSize: 13, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1,
  },
  dateText: { fontSize: 13, flex: 1 },
  dateSep: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 12 },
  resetBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 13, alignItems: 'center' },
  resetBtnText: { fontSize: 15, fontWeight: '600' },
  applyBtn: { flex: 2, borderRadius: 12, padding: 13, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700' },
});
