import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';

import type { CategoryKey } from '../utils/categoryRegistry';
import { normalizeCategoryKey } from '../utils/categoryRegistry';

interface Props {
  item: UnifiedTransaction;
  categoryLabels: Record<string, string>;
  accountColor: string;
  accountName: string;
  onPress?: () => void;
}

export function TransactionListItem({
  item, categoryLabels, accountColor, accountName, onPress,
}: Props) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const isCancellation = /^Cancellation\./i.test(item.description ?? '');
  const sign     = item.type === 'income' ? '+' : item.type === 'expense' ? '−' : '';
  const amtColor = item.type === 'income' ? theme.income : item.type === 'expense' ? theme.expense : theme.subtext;
  const catKey = normalizeCategoryKey(item.tag, item.category);
  const catLabel = categoryLabels[catKey] ?? catKey;
  const sym      = currencySymbol(item.currency);

  const content = (
    <>
      <View style={[styles.colorBar, { backgroundColor: accountColor }]} />
      <View style={styles.left}>
        <Text style={[styles.desc, { color: theme.text }]} numberOfLines={1}>
          {item.description ?? item.category ?? t.txTransaction}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.platform, { color: accountColor }]}>{accountName}</Text>
          <Text style={[styles.dot, { color: theme.subtext }]}> · </Text>
          <Text style={[styles.date, { color: theme.subtext }]}>
            {format(item.transactionDate, 'HH:mm')}
          </Text>
          {(item.tag || item.category) && catKey !== 'other' && (
            <>
              <Text style={[styles.dot, { color: theme.subtext }]}> · </Text>
              <Text style={[styles.tag, { color: theme.accent }]}>
                {catLabel}
              </Text>
            </>
          )}
          {item.feeAmount > 0 && (
            <>
              <Text style={[styles.dot, { color: theme.subtext }]}> · </Text>
              <Text style={[styles.fee, { color: theme.warning }]}>
                {t.txFee} {item.feeAmount.toLocaleString('uk-UA')} {item.feeCurrency ?? item.currency}
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.amountCol}>
        <Text style={[styles.amount, { color: amtColor }]}>
          {sign}{Math.abs(item.amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} {sym}
        </Text>
        {item.currency !== 'UAH' && (
          <Text style={[styles.currency, { color: theme.subtext }]}>{item.currency}</Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: theme.border, opacity: isCancellation ? 0.6 : 1 }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: theme.border, opacity: isCancellation ? 0.6 : 1 }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  colorBar:  { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: 10, minHeight: 36 },
  left:      { flex: 1, marginRight: 8 },
  desc:      { fontSize: 14, marginBottom: 4, fontWeight: '500' },
  meta:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  platform:  { fontSize: 11, fontWeight: '600' },
  dot:       { fontSize: 11 },
  date:      { fontSize: 11 },
  tag:       { fontSize: 11, fontWeight: '500' },
  fee:       { fontSize: 11 },
  amountCol: { alignItems: 'flex-end', paddingRight: 4 },
  amount:    { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  currency:  { fontSize: 11, fontWeight: '400' },
});
