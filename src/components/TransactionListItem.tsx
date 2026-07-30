import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';
import { numberLocale } from '../utils/locale';
import { radius, space, type } from '../theme/tokens';
import { storedCategoryKey } from '../utils/categories';
import { getCategoryColor } from '../utils/categoryImpact';
import { getTransactionAmountDisplay } from '../utils/transactionDisplay';

interface Props {
  item: UnifiedTransaction;
  categoryLabels: Record<string, string>;
  accountColor: string;
  accountName: string;
  onPress?: () => void;
}

function TransactionListItemInner({
  item, categoryLabels, accountColor, accountName, onPress,
}: Props) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const isCancellation = storedCategoryKey(item) === 'cancellation'
    || /^Cancellation\.|^Скасування\./i.test(item.description ?? '');
  const { sign, color: amtColor, muted } = getTransactionAmountDisplay(item, theme);
  const catKey = storedCategoryKey(item);
  const catLabel = categoryLabels[catKey] ?? catKey;
  const chipColor = getCategoryColor(catKey);
  const sym = currencySymbol(item.currency);
  const rowOpacity = isCancellation || muted ? 0.65 : 1;

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
          {item.feeAmount > 0 && (
            <>
              <Text style={[styles.dot, { color: theme.subtext }]}> · </Text>
              <Text style={[styles.fee, { color: theme.warning }]}>
                {t.txFee} {item.feeAmount.toLocaleString(loc)} {item.feeCurrency ?? item.currency}
              </Text>
            </>
          )}
        </View>
        <View style={[styles.tagChip, { backgroundColor: chipColor + '33', borderColor: chipColor }]}>
          <Text style={[styles.tagChipText, { color: chipColor }]} numberOfLines={1}>
            {catLabel}
          </Text>
        </View>
      </View>
      <View style={styles.amountCol}>
        <Text style={[styles.amount, { color: amtColor }]}>
          {sign}{Math.abs(item.amount).toLocaleString(loc, { maximumFractionDigits: 2 })} {sym}
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
        style={[styles.row, { borderBottomColor: theme.border, opacity: rowOpacity }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: theme.border, opacity: rowOpacity }]}>
      {content}
    </View>
  );
}

export const TransactionListItem = memo(
  TransactionListItemInner,
  (prev, next) => (
    prev.item.id === next.item.id
    && prev.item.tag === next.item.tag
    && prev.item.category === next.item.category
    && prev.item.amount === next.item.amount
    && prev.item.currency === next.item.currency
    && prev.item.type === next.item.type
    && prev.item.description === next.item.description
    && prev.item.transactionDate === next.item.transactionDate
    && prev.item.feeAmount === next.item.feeAmount
    && prev.accountColor === next.accountColor
    && prev.accountName === next.accountName
    && prev.categoryLabels === next.categoryLabels
    && prev.onPress === next.onPress
  ),
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space[3], borderBottomWidth: 1,
  },
  colorBar: { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: space[2.5], minHeight: 36 },
  left: { flex: 1, marginRight: space[2] },
  desc: { fontSize: 14, marginBottom: 4, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  platform: { ...type.caption },
  dot: { fontSize: 11 },
  date: { fontSize: 11 },
  tagChip: {
    alignSelf: 'flex-start',
    borderRadius: radius.xs,
    borderWidth: 1,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    maxWidth: '100%',
  },
  tagChipText: { fontSize: 12, fontWeight: '700' },
  fee: { fontSize: 11 },
  amountCol: { alignItems: 'flex-end', paddingRight: 4 },
  amount: { ...type.amount, textAlign: 'right' },
  currency: { fontSize: 11, fontWeight: '400' },
});
