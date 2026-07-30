import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useAccountsStore } from '../store/accountsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useCategoryLabels, useAllPickerCategoryKeys } from '../hooks/useCategoryLabels';
import { BottomSheetModal } from './BottomSheetModal';
import type { UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';
import { dateFnsLocale, numberLocale } from '../utils/locale';
import { radius, space, type } from '../theme/tokens';
import { storedCategoryKey, categoryForRetag } from '../utils/categories';
import { getCategoryColor } from '../utils/categoryImpact';
import { loadCategoryRules } from '../utils/categoryRules';
import { getTransactionAmountDisplay } from '../utils/transactionDisplay';
import { typeForCategory } from '../utils/retagTransactions';
import { getDatabase } from '../db/migrations';
import { extractRawPayloadFields, parseTradeDescription } from '../utils/txDetailFields';

interface Props {
  item: UnifiedTransaction | null;
  visible: boolean;
  onClose: () => void;
}

function DetailRow({
  label, value, theme,
}: {
  label: string;
  value: string;
  theme: { border: string; subtext: string; text: string };
}) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={[styles.rowLabel, { color: theme.subtext }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export function TxDetailModal({ item, visible, onClose }: Props) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const dateLoc = dateFnsLocale(language);
  const { updateTransactionTag, unlockAndSetCategory, transactions, recentTransactions } = useTransactionsStore();
  const { accounts } = useAccountsStore();
  const categoryLabels = useCategoryLabels();
  const pickerKeys = useAllPickerCategoryKeys();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [localTx, setLocalTx] = useState<UnifiedTransaction | null>(item);

  useEffect(() => {
    if (!item) {
      setLocalTx(null);
      return;
    }
    const fresh =
      transactions.find((x) => x.id === item.id)
      ?? recentTransactions.find((x) => x.id === item.id)
      ?? item;
    setLocalTx(fresh);
    setShowCategoryPicker(false);
  }, [item, transactions, recentTransactions, visible]);

  const trade = useMemo(
    () => parseTradeDescription(localTx?.description),
    [localTx?.description],
  );
  const rawRows = useMemo(
    () => extractRawPayloadFields(localTx?.rawPayload),
    [localTx?.rawPayload],
  );

  if (!localTx) return null;

  const tx = localTx;
  const { sign, color: amtColor } = getTransactionAmountDisplay(tx, theme);
  const account = accounts.find((a) => a.id === tx.accountId);
  const accountLabel = account ? (account.displayName ?? account.name) : tx.accountId;
  const categoryKey = storedCategoryKey(tx);
  const categoryLabel = categoryLabels[categoryKey] ?? categoryKey;
  const chipColor = getCategoryColor(categoryKey);

  function handleCategorySelect(key: string) {
    updateTransactionTag(tx.id, key, key);
    setLocalTx({ ...tx, tag: key, category: key, categoryLocked: true });
    setShowCategoryPicker(false);
  }

  function handleClearAndAutodetect() {
    const ownIbans = accounts.filter((a) => a.iban).map((a) => a.iban!);
    const rules = loadCategoryRules();
    const catKey = categoryForRetag(
      {
        mcc: tx.mcc ?? null,
        description: tx.description ?? null,
        raw_payload: tx.rawPayload ?? null,
        amount: tx.amount,
        platform: tx.platform,
        type: tx.type,
        currency: tx.currency,
      },
      ownIbans,
      accounts,
      rules,
    );
    const nextType = typeForCategory(catKey, tx.type);
    unlockAndSetCategory(tx.id, catKey, catKey);
    try {
      getDatabase().runSync(
        'UPDATE transactions SET type = ? WHERE id = ?',
        [nextType, tx.id],
      );
    } catch { /* ignore */ }
    setLocalTx({
      ...tx,
      tag: catKey,
      category: catKey,
      type: nextType,
      categoryLocked: false,
    });
    setShowCategoryPicker(false);
  }

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title={t.txDetail} scroll maxHeight="90%">
        <View style={[styles.amountBox, { backgroundColor: amtColor + '18', borderColor: amtColor + '44' }]}>
          <Text style={[styles.amount, { color: amtColor }]}>
            {sign}{Math.abs(tx.amount).toLocaleString(loc, { maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.currency, { color: amtColor }]}>
            {currencySymbol(tx.currency)} {tx.currency}
          </Text>
        </View>

        {tx.description && (
          <DetailRow label={t.txDescription} value={tx.description} theme={theme} />
        )}

        {trade && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>{t.txTradeDetails}</Text>
            <DetailRow label={t.txTradeSide} value={trade.side ?? '—'} theme={theme} />
            <DetailRow label={t.txTradeSymbol} value={trade.symbol ?? '—'} theme={theme} />
            <DetailRow label={t.txTradeQty} value={trade.qty ?? '—'} theme={theme} />
            <DetailRow label={t.txTradePrice} value={trade.price ?? '—'} theme={theme} />
          </>
        )}

        {(tx.feeAmount ?? 0) > 0 || tx.feeType ? (
          <>
            <DetailRow
              label={t.txFeeAmount}
              value={
                (tx.feeAmount ?? 0) > 0
                  ? `${tx.feeAmount.toLocaleString(loc, { maximumFractionDigits: 4 })} ${currencySymbol(tx.feeCurrency ?? tx.currency)} ${tx.feeCurrency ?? tx.currency}`
                  : (tx.feeType ?? '—')
              }
              theme={theme}
            />
            {tx.feeType && (tx.feeAmount ?? 0) > 0 ? (
              <DetailRow label={t.txFeeType} value={tx.feeType} theme={theme} />
            ) : null}
          </>
        ) : null}

        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txCategory}</Text>
          <TouchableOpacity
            style={[styles.tagChip, { backgroundColor: chipColor + '33', borderColor: chipColor }]}
            onPress={() => setShowCategoryPicker(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tagChipText, { color: chipColor }]}>{categoryLabel}</Text>
            <Ionicons name="pencil-outline" size={12} color={chipColor} />
          </TouchableOpacity>
        </View>

        <DetailRow label={t.txType} value={tx.type} theme={theme} />

        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={[styles.rowLabel, { color: theme.subtext }]}>{t.txAccount}</Text>
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={[styles.rowValue, { color: theme.text }]}>{accountLabel}</Text>
            {account?.name && account.name !== accountLabel && (
              <Text style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>{account.name}</Text>
            )}
          </View>
        </View>

        <DetailRow label={t.txPlatform} value={tx.platform} theme={theme} />

        <DetailRow
          label={t.txExactDate}
          value={format(tx.transactionDate, 'd MMMM yyyy, HH:mm', { locale: dateLoc })}
          theme={theme}
        />

        {tx.exchangeRate != null && tx.exchangeRate > 0 && (
          <DetailRow label={t.txExchangeRate} value={String(tx.exchangeRate)} theme={theme} />
        )}
        {tx.amountBase != null && (
          <DetailRow
            label={t.txAmountBase}
            value={tx.amountBase.toLocaleString(loc, { maximumFractionDigits: 2 })}
            theme={theme}
          />
        )}

        {tx.mcc != null && tx.mcc > 0 && (
          <DetailRow label={t.txMcc} value={String(tx.mcc)} theme={theme} />
        )}
        {tx.counterparty ? <DetailRow label={t.txCounterparty} value={tx.counterparty} theme={theme} /> : null}
        {tx.directionFrom ? <DetailRow label={t.txDirectionFrom} value={tx.directionFrom} theme={theme} /> : null}
        {tx.directionTo ? <DetailRow label={t.txDirectionTo} value={tx.directionTo} theme={theme} /> : null}
        {tx.externalId ? <DetailRow label={t.txExternalId} value={tx.externalId} theme={theme} /> : null}

        {rawRows.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>{t.txScraperDetails}</Text>
            {rawRows.map((r) => (
              <DetailRow key={`${r.label}-${r.value}`} label={r.label} value={r.value} theme={theme} />
            ))}
          </>
        )}
      </BottomSheetModal>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowCategoryPicker(false)}>
          <Pressable
            style={[styles.pickerSheet, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>{t.txCategory}</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[styles.tagOption, styles.autodetectOption, { borderColor: theme.accent }]}
                onPress={handleClearAndAutodetect}
                activeOpacity={0.75}
              >
                <Ionicons name="refresh-outline" size={16} color={theme.accent} />
                <Text style={[styles.tagOptionText, { color: theme.accent, flex: 1 }]}>
                  {t.txClearAndAutodetect}
                </Text>
              </TouchableOpacity>
              {pickerKeys.map((key) => {
                const color = getCategoryColor(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tagOption,
                      { borderColor: theme.border },
                      categoryKey === key && { backgroundColor: color + '22' },
                    ]}
                    onPress={() => handleCategorySelect(key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tagOptionText, { color: categoryKey === key ? color : theme.text }]}>
                      {categoryLabels[key] ?? key}
                    </Text>
                    {categoryKey === key && <Ionicons name="checkmark" size={14} color={color} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  amountBox: {
    borderRadius: radius.md, borderWidth: 1, padding: space[4], alignItems: 'center', marginBottom: space[3],
  },
  amount: { ...type.kpi, fontSize: 28 },
  currency: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: space[3], marginBottom: space[1],
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: space[2.5], borderBottomWidth: StyleSheet.hairlineWidth, gap: space[3],
  },
  rowLabel: { fontSize: 13, fontWeight: '500', maxWidth: '42%' },
  rowValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', flex: 1 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: space[2.5], paddingVertical: 5,
  },
  tagChipText: { fontSize: 13, fontWeight: '700' },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  pickerSheet: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space[3],
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[2],
  },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  tagOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: space[3], paddingVertical: space[2.5],
    marginBottom: 6, gap: 8,
  },
  autodetectOption: { marginBottom: 12 },
  tagOptionText: { fontSize: 14, fontWeight: '500' },
});
