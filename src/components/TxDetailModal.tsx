import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTransactionsStore } from '../store/transactionsSlice';
import { useAccountsStore } from '../store/accountsSlice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useCategoryLabels, useAllPickerCategoryKeys } from '../hooks/useCategoryLabels';
import { BottomSheetModal } from './BottomSheetModal';
import { PressableScale } from './PressableScale';
import { WiggleActionIcon } from './MotionIcons';
import type { UnifiedTransaction } from '../types';
import { currencySymbol } from '../utils/currency';
import { dateFnsLocale, numberLocale } from '../utils/locale';
import { radius, space, stroke, type } from '../theme/tokens';
import {
  softBadgeStyle, selectChipStyle, commonStyles, sectionLabelStyle,
} from '../theme/commonStyles';
import { storedCategoryKey, categoryForRetag } from '../utils/categories';
import { getCategoryColor } from '../utils/categoryImpact';
import { loadCategoryRules } from '../utils/categoryRules';
import { getTransactionAmountDisplay } from '../utils/transactionDisplay';
import { typeForCategory } from '../utils/retagTransactions';
import { getDatabase } from '../db/migrations';
import {
  extractRawPayloadFields, parseTradeDescription, tradeSkipOpts,
} from '../utils/txDetailFields';

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
  const itemRef = React.useRef(item);
  itemRef.current = item;

  useEffect(() => {
    if (!item) {
      // Keep localTx until sheet close animation finishes (onClosed).
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
  const rawRows = useMemo(() => {
    const tradeOpts = tradeSkipOpts(trade);
    const skipLabels = new Set<string>([...(tradeOpts.skipLabels ?? [])]);
    const skipValues = new Set<string>([...(tradeOpts.skipValues ?? [])]);

    if (localTx?.description) {
      skipLabels.add('Контрагент');
      skipValues.add(localTx.description);
    }
    if (localTx?.mcc != null && localTx.mcc > 0) {
      skipLabels.add('MCC');
      skipValues.add(String(localTx.mcc));
    }
    if ((localTx?.feeAmount ?? 0) > 0 || localTx?.feeType) {
      skipLabels.add('Комісія');
      if (localTx?.feeType) skipValues.add(localTx.feeType);
      if (localTx?.feeAmount != null) skipValues.add(String(localTx.feeAmount));
    }
    if (localTx?.currency) {
      skipLabels.add('Currency');
      skipValues.add(localTx.currency);
    }
    if (localTx?.exchangeRate != null && localTx.exchangeRate > 0) {
      skipLabels.add('Курс');
      skipValues.add(String(localTx.exchangeRate));
    }
    if (localTx?.accountId) skipValues.add(localTx.accountId);
    if (localTx?.externalId) skipValues.add(localTx.externalId);
    if (localTx?.counterparty) {
      skipLabels.add('Контрагент');
      skipValues.add(localTx.counterparty);
    }

    return extractRawPayloadFields(localTx?.rawPayload, { skipLabels, skipValues });
  }, [localTx, trade]);

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
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        onClosed={() => {
          if (!itemRef.current) {
            setLocalTx(null);
            setShowCategoryPicker(false);
          }
        }}
        title={t.txDetail}
        scroll
      >
        <View style={[styles.amountBox, { backgroundColor: amtColor + '18', borderColor: amtColor + '55' }]}>
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
            <Text style={sectionLabelStyle(theme.subtext, space[1])}>{t.txTradeDetails}</Text>
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
          <PressableScale
            style={softBadgeStyle(chipColor)}
            onPress={() => setShowCategoryPicker(true)}
            scaleTo={0.96}
          >
            <Text style={[styles.tagChipText, { color: chipColor }]}>{categoryLabel}</Text>
            <WiggleActionIcon
              name="pencil-outline"
              size={12}
              color={theme.accent}
              onPress={() => setShowCategoryPicker(true)}
            />
          </PressableScale>
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
            <Text style={sectionLabelStyle(theme.subtext, space[1])}>{t.txScraperDetails}</Text>
            {rawRows.map((r) => (
              <DetailRow key={`${r.label}-${r.value}`} label={r.label} value={r.value} theme={theme} />
            ))}
          </>
        )}
      </BottomSheetModal>

      <BottomSheetModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title={t.txCategory}
        scroll
      >
        <PressableScale
          style={[
            selectChipStyle(theme, true),
            styles.tagOption,
            { marginBottom: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2] },
          ]}
          onPress={handleClearAndAutodetect}
          scaleTo={0.97}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.accent} />
          <Text style={{ color: theme.accent, flex: 1, fontWeight: '600', fontSize: 14 }}>
            {t.txClearAndAutodetect}
          </Text>
        </PressableScale>
        <View style={commonStyles.chipRow}>
          {pickerKeys.map((key) => {
            const active = categoryKey === key;
            const color = getCategoryColor(key);
            return (
              <PressableScale
                key={key}
                style={[
                  selectChipStyle(
                    { accent: color, border: theme.border, cardAlt: theme.cardAlt },
                    active,
                  ),
                  { minWidth: '47%', flexGrow: 1 },
                ]}
                onPress={() => handleCategorySelect(key)}
                scaleTo={0.97}
              >
                <View style={styles.tagOptionInner}>
                  <Text style={{
                    color: active ? color : theme.text,
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '500',
                  }}>
                    {categoryLabels[key] ?? key}
                  </Text>
                  {active && <Ionicons name="checkmark" size={14} color={color} />}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  amountBox: {
    borderRadius: radius.md,
    borderWidth: stroke.width,
    padding: space[4],
    alignItems: 'center',
    marginBottom: space[3],
  },
  amount: { ...type.kpi, fontSize: 28 },
  currency: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: space[2.5], borderBottomWidth: stroke.hairline, gap: space[3],
  },
  rowLabel: { fontSize: 13, fontWeight: '500', maxWidth: '40%' },
  rowValue: {
    fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', flex: 1,
    paddingRight: 2,
  },
  tagChipText: { fontSize: 13, fontWeight: '700' },
  tagOption: {
    paddingVertical: space[2.5],
    paddingHorizontal: space[3],
  },
  tagOptionInner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  },
});
