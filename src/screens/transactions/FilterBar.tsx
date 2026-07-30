import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { currencySymbol } from '../../utils/currency';
import type { TransactionType, Account } from '../../types';
import type { FilterPlatform } from './types';
import { FilterChip } from './FilterChip';

interface FilterBarProps {
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
  platformLabels: Record<FilterPlatform, string>;
  typeLabels: Record<TransactionType, string>;
  categoryLabels: Record<string, string>;
  onOpenFilters: () => void;
}

export function FilterBar({
  selPlatforms, setSelPlatforms, selTypes, setSelTypes,
  selAccountId, setSelAccountId, accounts,
  dateFrom, dateTo, setDateFrom, setDateTo,
  selCurrencies, setSelCurrencies,
  selCategories, setSelCategories,
  platformLabels, typeLabels, categoryLabels, onOpenFilters,
}: FilterBarProps) {
  void selTypes;
  void setSelTypes;
  void typeLabels;
  void onOpenFilters;
  const { theme, cardSurface } = useTheme();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const accountName = selAccountId
    ? (accounts.find((a) => a.id === selAccountId)?.displayName
      ?? accounts.find((a) => a.id === selAccountId)?.name
      ?? selAccountId)
    : null;

  const allChips: Array<{ id: string; label: string; onRemove: () => void }> = [
    ...selPlatforms.map((p) => ({
      id: `p-${p}`, label: platformLabels[p],
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelPlatforms(selPlatforms.filter((x) => x !== p));
      },
    })),
    ...(selAccountId && accountName ? [{
      id: 'account',
      label: accountName,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelAccountId(null);
      },
    }] : []),
    ...selCategories.map((cat) => ({
      id: `cat-${cat}`,
      label: categoryLabels[cat] ?? cat,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelCategories(selCategories.filter((x) => x !== cat));
      },
    })),
    ...(dateFrom ? [{
      id: 'date-from',
      label: `${t.txDateFrom}: ${format(dateFrom, 'dd.MM.yy')}`,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDateFrom(null);
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
    ...selCurrencies.map((code) => ({
      id: `cur-${code}`,
      label: `${currencySymbol(code)} ${code}`,
      onRemove: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelCurrencies(selCurrencies.filter((x) => x !== code));
      },
    })),
  ];

  const MAX_VISIBLE_ROWS = 2;
  const CHIPS_PER_ROW = 3;
  const maxVisible = MAX_VISIBLE_ROWS * CHIPS_PER_ROW;
  const hasOverflow = allChips.length > maxVisible;
  const visibleChips = expanded ? allChips : allChips.slice(0, maxVisible);
  const hasAny = allChips.length > 0;

  if (!hasAny) return null;

  return (
    <View style={[fbStyles.container, cardSurface(), { borderColor: theme.border }]}>
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
