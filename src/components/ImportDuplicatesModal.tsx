import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { UnifiedTransaction } from '../types';
import { dateFnsLocale, numberLocale } from '../utils/locale';
import { getTransactionAmountDisplay } from '../utils/transactionDisplay';

export interface ImportDuplicatesModalProps {
  visible: boolean;
  title: string;
  message: string;
  duplicates: UnifiedTransaction[];
  onCancel: () => void;
  onAddWithoutDuplicates: () => void;
  onAddWithDuplicates: (selected: UnifiedTransaction[]) => void;
}

export function ImportDuplicatesModal({
  visible,
  title,
  message,
  duplicates,
  onCancel,
  onAddWithoutDuplicates,
  onAddWithDuplicates,
}: ImportDuplicatesModalProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const dateLoc = dateFnsLocale(language);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const keys = useMemo(
    () => duplicates.map((tx, idx) => `${tx.id}::${idx}`),
    [duplicates],
  );

  useEffect(() => {
    if (visible) setSelected(new Set(keys));
  }, [visible, keys]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(keys));
  }

  function selectNone() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const selectedTxs = duplicates.filter((_, idx) => selected.has(keys[idx]));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.subtext }]}>{message}</Text>
          <Text style={[styles.hint, { color: theme.accent }]}>
            {t.importDuplicatesSelectHint}
          </Text>

          <View style={styles.listHeader}>
            <Text style={[styles.listLabel, { color: theme.subtext }]}>
              {t.importDuplicatesListLabel
                .replace('{count}', String(duplicates.length))}
              {selectedCount > 0 ? ` · ${selectedCount}` : ''}
            </Text>
            <View style={styles.selectActions}>
              <TouchableOpacity onPress={selectAll} hitSlop={8}>
                <Text style={[styles.selectLink, { color: theme.accent }]}>{t.importSelectAll}</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.border }}>|</Text>
              <TouchableOpacity onPress={selectNone} hitSlop={8}>
                <Text style={[styles.selectLink, { color: theme.subtext }]}>{t.importSelectNone}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {duplicates.map((tx, idx) => {
              const key = keys[idx];
              const isOn = selected.has(key);
              const { sign, color } = getTransactionAmountDisplay(tx, theme);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.row,
                    {
                      borderBottomColor: theme.border,
                      backgroundColor: isOn ? theme.accent + '18' : 'transparent',
                      borderLeftColor: isOn ? theme.accent : 'transparent',
                    },
                  ]}
                  onPress={() => toggle(key)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isOn ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isOn ? theme.accent : theme.subtext}
                    style={{ marginTop: 2 }}
                  />
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowDesc, { color: theme.text }]} numberOfLines={2}>
                      {tx.description?.trim() || t.txTransaction}
                    </Text>
                    <Text style={[styles.rowDate, { color: theme.subtext }]}>
                      {format(tx.transactionDate, 'd MMM yyyy, HH:mm', { locale: dateLoc })}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color }]}>
                    {sign}{Math.abs(tx.amount).toLocaleString(loc, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}{tx.currency}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.actionBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: theme.subtext, fontWeight: '400' }]}>
                {t.importCancelImport}
              </Text>
            </TouchableOpacity>
            <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={styles.actionBtn} onPress={onAddWithoutDuplicates} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: theme.accent }]}>
                {t.importAddWithoutDuplicates}
              </Text>
            </TouchableOpacity>
            <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={[styles.actionBtn, selectedCount === 0 && { opacity: 0.4 }]}
              onPress={() => {
                if (selectedCount === 0) return;
                onAddWithDuplicates(selectedTxs);
              }}
              activeOpacity={0.7}
              disabled={selectedCount === 0}
            >
              <Text style={[styles.actionText, { color: theme.expense }]}>
                {t.importAddWithDuplicates}
                {selectedCount > 0 ? ` (${selectedCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 20,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  selectActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectLink: { fontSize: 12, fontWeight: '600' },
  list: {
    maxHeight: 280,
    marginHorizontal: 8,
  },
  listContent: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  rowMain: { flex: 1 },
  rowDesc: { fontSize: 13, fontWeight: '500' },
  rowDate: { fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 13, fontWeight: '700' },
  actions: {
    borderTopWidth: 1,
    marginTop: 4,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  actionDivider: { height: StyleSheet.hairlineWidth },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
