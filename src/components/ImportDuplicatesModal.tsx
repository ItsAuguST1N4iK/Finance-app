import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { UnifiedTransaction } from '../types';
import { dateFnsLocale, numberLocale } from '../utils/locale';
import { getTransactionAmountDisplay } from '../utils/transactionDisplay';
import { BottomSheetModal } from './BottomSheetModal';
import { PressableScale } from './PressableScale';
import { radius, space } from '../theme/tokens';

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
    <BottomSheetModal
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={(
        <View style={styles.actions}>
          <PressableScale style={styles.actionBtn} onPress={onCancel} scaleTo={0.97}>
            <Text style={[styles.actionText, { color: theme.subtext, fontWeight: '400' }]}>
              {t.importCancelImport}
            </Text>
          </PressableScale>
          <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
          <PressableScale style={styles.actionBtn} onPress={onAddWithoutDuplicates} scaleTo={0.97}>
            <Text style={[styles.actionText, { color: theme.accent }]}>
              {t.importAddWithoutDuplicates}
            </Text>
          </PressableScale>
          <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
          <PressableScale
            style={styles.actionBtn}
            disabled={selectedCount === 0}
            onPress={() => {
              if (selectedCount === 0) return;
              onAddWithDuplicates(selectedTxs);
            }}
            scaleTo={0.97}
          >
            <Text style={[styles.actionText, { color: theme.expense }]}>
              {t.importAddWithDuplicates}
              {selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Text>
          </PressableScale>
        </View>
      )}
    >
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
          <PressableScale onPress={selectAll} hitSlop={8} scaleTo={0.95}>
            <Text style={[styles.selectLink, { color: theme.accent }]}>{t.importSelectAll}</Text>
          </PressableScale>
          <View style={{ width: 1, height: 12, backgroundColor: theme.border, borderRadius: 1 }} />
          <PressableScale onPress={selectNone} hitSlop={8} scaleTo={0.95}>
            <Text style={[styles.selectLink, { color: theme.subtext }]}>{t.importSelectNone}</Text>
          </PressableScale>
        </View>
      </View>

      {duplicates.map((tx, idx) => {
        const key = keys[idx];
        const isOn = selected.has(key);
        const { sign, color } = getTransactionAmountDisplay(tx, theme);
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: theme.border,
                backgroundColor: isOn ? theme.accent + '18' : 'transparent',
                borderLeftColor: isOn ? theme.accent : 'transparent',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={() => toggle(key)}
          >
            <View style={styles.rowInner}>
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
            </View>
          </Pressable>
        );
      })}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: space[2],
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: space[3],
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[2],
    gap: space[2],
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  selectActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectLink: { fontSize: 12, fontWeight: '600' },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rowMain: { flex: 1 },
  rowDesc: { fontSize: 13, fontWeight: '500' },
  rowDate: { fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 13, fontWeight: '700' },
  actions: {
    gap: 0,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionDivider: { height: StyleSheet.hairlineWidth },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
