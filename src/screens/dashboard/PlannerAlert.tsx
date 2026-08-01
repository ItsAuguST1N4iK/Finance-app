import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import type { PlannedIncome } from '../../types';
import { currencySymbol } from '../../utils/currency';
import { numberLocale } from '../../utils/locale';
import { radius, space, stroke } from '../../theme/tokens';

// ─── Planner Alert ────────────────────────────────────

export function PlannerAlert({ item }: { item: PlannedIncome }) {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const daysLeft  = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = item.status === 'overdue';

  const subText = isOverdue
    ? t.overdue
    : daysLeft === 0
    ? t.today
    : t.inDays.replace('{n}', String(daysLeft));

  return (
    <View style={[styles.plannerAlert, cardSurface(), {
      borderColor: isOverdue ? theme.expense : theme.warning,
    }]}>
      <Ionicons
        name={isOverdue ? 'warning-outline' : 'calendar-outline'}
        size={16}
        color={isOverdue ? theme.expense : theme.warning}
      />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[styles.plannerName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.plannerSub, { color: theme.subtext }]}>
          {item.amount.toLocaleString(loc)} {currencySymbol(item.currency)} · {subText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plannerAlert: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, padding: space[3], marginBottom: space[2], borderWidth: stroke.width,
  },
  plannerName: { fontSize: 14, fontWeight: '500' },
  plannerSub:  { fontSize: 12, marginTop: 2 },
});
