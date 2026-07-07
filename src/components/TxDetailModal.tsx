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
import { useTagLabels } from '../hooks/useTagLabels';
import type { UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';
import { ALL_TAGS, TagType } from '../utils/tags';
import { autoDetectCategory, resolveTransactionCategory } from '../utils/categories';

interface Props {
  item: UnifiedTransaction | null;
  visible: boolean;
  onClose: () => void;
}

export function TxDetailModal({ item, visible, onClose }: Props) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { updateTransactionTag } = useTransactionsStore();
  const { accounts } = useAccountsStore();
  const tagLabels = useTagLabels();
  const [showTagPicker, setShowTagPicker] = useState(false);

  if (!item) return null;

  const tx = item;
  const sign     = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const amtColor = tx.type === 'income' ? theme.income : tx.type === 'expense' ? theme.expense : theme.subtext;
  const account  = accounts.find((a) => a.id === tx.accountId);
  const accountLabel = account ? (account.displayName ?? account.name) : tx.accountId;
  const categoryLabel = resolveTransactionCategory(tx);

  function handleTagSelect(tag: TagType | null) {
    const category = tag
      ? autoDetectCategory(tx.mcc, tx.description, tag)
      : tx.category;
    updateTransactionTag(tx.id, tag, category);
    setShowTagPicker(false);
  }

  const tagLabel = tx.tag ? (tagLabels[tx.tag] ?? tx.tag) : t.tagNoTag;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                  <Text style={[styles.rowLabel, { color: theme.subtext }]}>Опис</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{tx.description}</Text>
                </View>
              )}

              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>Категорія</Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>{categoryLabel}</Text>
              </View>

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
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>Платформа</Text>
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

              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.tagLabel}</Text>
                <TouchableOpacity
                  style={[styles.tagChip, {
                    backgroundColor: tx.tag ? theme.accent + '22' : theme.cardAlt,
                    borderColor: tx.tag ? theme.accent : theme.border,
                  }]}
                  onPress={() => setShowTagPicker(true)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagChipText, { color: tx.tag ? theme.accent : theme.subtext }]}>
                    {tagLabel}
                  </Text>
                  <Ionicons name="pencil-outline" size={12} color={tx.tag ? theme.accent : theme.subtext} />
                </TouchableOpacity>
              </View>

              {showTagPicker && (
                <View style={[styles.tagPickerBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.tagOption, { borderColor: theme.border }, !tx.tag && { backgroundColor: theme.accent + '22' }]}
                    onPress={() => handleTagSelect(null)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tagOptionText, { color: !tx.tag ? theme.accent : theme.subtext }]}>
                      {t.tagNoTag}
                    </Text>
                  </TouchableOpacity>
                  {ALL_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagOption, { borderColor: theme.border }, tx.tag === tag && { backgroundColor: theme.accent + '22' }]}
                      onPress={() => handleTagSelect(tag)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tagOptionText, { color: tx.tag === tag ? theme.accent : theme.text }]}>
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
