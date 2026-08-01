import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PressableScale } from '../../components/PressableScale';
import { ChevronToggle } from '../../components/MotionIcons';
import { format } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { currencySymbol } from '../../utils/currency';
import type { TransactionType, Account } from '../../types';
import type { FilterPlatform } from './types';
import { FilterChip } from './FilterChip';
import { Collapsible } from '../../components/Collapsible';
import { radius, stroke } from '../../theme/tokens';

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
  const [wrapMounted, setWrapMounted] = useState(false);

  const accountName = selAccountId
    ? (accounts.find((a) => a.id === selAccountId)?.displayName
      ?? accounts.find((a) => a.id === selAccountId)?.name
      ?? selAccountId)
    : null;

  const allChips: Array<{ id: string; label: string; onRemove: () => void }> = [
    ...selPlatforms.map((p) => ({
      id: `p-${p}`, label: platformLabels[p],
      onRemove: () => setSelPlatforms(selPlatforms.filter((x) => x !== p)),
    })),
    ...(selAccountId && accountName ? [{
      id: 'account',
      label: accountName,
      onRemove: () => setSelAccountId(null),
    }] : []),
    ...selCategories.map((cat) => ({
      id: `cat-${cat}`,
      label: categoryLabels[cat] ?? cat,
      onRemove: () => setSelCategories(selCategories.filter((x) => x !== cat)),
    })),
    ...(dateFrom ? [{
      id: 'date-from',
      label: `${t.txDateFrom}: ${format(dateFrom, 'dd.MM.yy')}`,
      onRemove: () => setDateFrom(null),
    }] : []),
    ...(dateTo ? [{
      id: 'date-to',
      label: `${t.txDateTo}: ${format(dateTo, 'dd.MM.yy')}`,
      onRemove: () => setDateTo(null),
    }] : []),
    ...selCurrencies.map((code) => ({
      id: `cur-${code}`,
      label: `${currencySymbol(code)} ${code}`,
      onRemove: () => setSelCurrencies(selCurrencies.filter((x) => x !== code)),
    })),
  ];

  if (allChips.length === 0) return null;

  function clearAll() {
    setSelPlatforms([]);
    setSelAccountId(null);
    setSelCategories([]);
    setDateFrom(null);
    setDateTo(null);
    setSelCurrencies([]);
    setExpanded(false);
    setWrapMounted(false);
  }

  const canToggle = allChips.length > 3;
  const showLine = !expanded && !wrapMounted;

  function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setWrapMounted(true);
    setExpanded(true);
  }

  return (
    <View style={[fbStyles.container, cardSurface(), { borderColor: theme.border }]}>
      {showLine || !canToggle ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={fbStyles.oneLineScroll}
          contentContainerStyle={fbStyles.oneLineContent}
        >
          {allChips.map((chip) => (
            <FilterChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
          ))}
        </ScrollView>
      ) : null}

      {canToggle && wrapMounted ? (
        <Collapsible expanded={expanded} onClosed={() => setWrapMounted(false)}>
          <View style={fbStyles.chipsWrap}>
            {allChips.map((chip) => (
              <FilterChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
            ))}
          </View>
        </Collapsible>
      ) : null}

      <View style={[fbStyles.actionsRow, { borderTopColor: theme.border }]}>
        <PressableScale onPress={clearAll} style={fbStyles.linkBtn} scaleTo={0.96} feedback="opacity">
          <Text style={[fbStyles.linkText, { color: theme.accent }]}>{t.txClearAllFilters}</Text>
        </PressableScale>

        <View style={[fbStyles.divider, { backgroundColor: theme.border }]} />

        {canToggle ? (
          <PressableScale
            onPress={toggleExpand}
            style={fbStyles.linkBtnEnd}
            scaleTo={0.96}
            feedback="opacity"
          >
            <Text style={[fbStyles.linkText, { color: theme.accent }]}>
              {expanded ? t.txCollapseFilters : t.txExpandFilters}
            </Text>
            <ChevronToggle expanded={expanded} size={16} color={theme.accent} />
          </PressableScale>
        ) : (
          <View style={fbStyles.linkBtnEnd} />
        )}
      </View>
    </View>
  );
}

const fbStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: radius.lg,
    borderWidth: stroke.width,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  oneLineScroll: {
    maxHeight: 32,
  },
  oneLineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  linkBtnEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 14,
    borderRadius: 1,
  },
});
