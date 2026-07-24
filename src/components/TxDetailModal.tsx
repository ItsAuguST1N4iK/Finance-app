import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useAccountsStore } from '../store/accountsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useCategoryLabels } from '../hooks/useCategoryLabels';
import type { UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';
import { ALL_CATEGORY_KEYS, type CategoryKey } from '../utils/categoryRegistry';
import { resolveTransactionCategory } from '../utils/categories';

interface Props {
  item: UnifiedTransaction | null;
  visible: boolean;
  onClose: () => void;
}

export function TxDetailModal({ item, visible, onClose }: Props) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const { updateTransactionTag } = useTransactionsStore();
  const { accounts } = useAccountsStore();
  const categoryLabels = useCategoryLabels();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  if (!item) return null;

  const tx = item;
  const sign     = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const amtColor = tx.type === 'income' ? theme.income : tx.type === 'expense' ? theme.expense : theme.subtext;
  const account  = accounts.find((a) => a.id === tx.accountId);
  const accountLabel = account ? (account.displayName ?? account.name) : tx.accountId;
  const categoryKey = resolveTransactionCategory(tx);
  const categoryLabel = categoryLabels[categoryKey] ?? categoryKey;

  function handleCategorySelect(key: CategoryKey | null) {
    updateTransactionTag(tx.id, key, key ?? tx.category);
    setShowCategoryPicker(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.sheet, cardSurface(), { borderColor: theme.border }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>{t.txDetail}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
                <Ionicons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.amountBox, { backgroundColor: amtColor + '18', borderColor: amtColor + '44' }]}>
                <Text style={[styles.amount, { color: amtColor }]}>
                  {sign}{Math.abs(tx.amount).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.currency, { color: amtColor }]}>
                  {currencySymbol(tx.currency)} {tx.currency}
                </Text>
              </View>

              {tx.description && (
                <View style={[styles.row, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txDescription}</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{tx.description}</Text>
                </View>
              )}

              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txCategory}</Text>
                <TouchableOpacity
                  style={[styles.tagChip, {
                    backgroundColor: categoryKey !== 'other' ? theme.accent + '22' : theme.cardAlt,
                    borderColor: categoryKey !== 'other' ? theme.accent : theme.border,
                  }]}
                  onPress={() => setShowCategoryPicker((v) => !v)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagChipText, { color: categoryKey !== 'other' ? theme.accent : theme.subtext }]}>
                    {categoryLabel}
                  </Text>
                  <Ionicons name="pencil-outline" size={12} color={categoryKey !== 'other' ? theme.accent : theme.subtext} />
                </TouchableOpacity>
              </View>

              {showCategoryPicker && (
                <View style={[styles.tagPickerBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                  {ALL_CATEGORY_KEYS.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.tagOption, { borderColor: theme.border }, categoryKey === key && { backgroundColor: theme.accent + '22' }]}
                      onPress={() => handleCategorySelect(key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tagOptionText, { color: categoryKey === key ? theme.accent : theme.text }]}>
                        {categoryLabels[key]}
                      </Text>
                      {categoryKey === key && <Ionicons name="checkmark" size={14} color={theme.accent} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txAccount}</Text>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{accountLabel}</Text>
                  {account?.name && account.name !== accountLabel && (
                    <Text style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>{account.name}</Text>
                  )}
                </View>
              </View>

              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txExactDate}</Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>
                  {format(tx.transactionDate, 'd MMMM yyyy, HH:mm', { locale: uk })}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txPlatform}</Text>
                <Text style={[styles.rowValue, { color: theme.accent }]}>{tx.platform}</Text>
              </View>

              {tx.feeAmount > 0 && (
                <View style={[styles.row, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txFee}</Text>
                  <Text style={[styles.rowValue, { color: theme.warning }]}>
                    {tx.feeAmount.toLocaleString('uk-UA')} {tx.feeCurrency ?? tx.currency}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, padding: 20, maxHeight: '85%',
  },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '700' },
  amountBox: {
    borderRadius: 14, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'baseline', gap: 6, borderWidth: 1,
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
  tagPickerBox: { borderRadius: 12, borderWidth: 1, padding: 8, marginTop: 4, marginBottom: 8, gap: 2 },
  tagOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, marginBottom: 4,
  },
  tagOptionText: { fontSize: 13 },
});
