import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { format } from 'date-fns';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { TxDetailModal } from '../../components/TxDetailModal';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAccountsStore } from '../../store/accountsSlice';
import { mapDbRowToTransaction } from '../../store/transactionsSlice';
import { getDatabase } from '../../db/migrations';
import { currencySymbol } from '../../utils/currency';
import { tryConvertToHomeCurrency } from '../../utils/currencyConvert';
import { dateFnsLocale, numberLocale } from '../../utils/locale';
import { useExchangeRatesStore } from '../../store/exchangeRatesSlice';
import type { AnalyticsRawTx } from '../../utils/analyticsCompute';
import type { UnifiedTransaction } from '../../types';
import { PLATFORM_COLORS, PlatformShareBar, type PlatformShareItem } from './PlatformShareBar';

interface Props {
  visible: boolean;
  categoryKey: string | null;
  categoryLabel: string;
  txs: AnalyticsRawTx[];
  homeCurrency: string;
  onClose: () => void;
}

export function CategoryDrillSheet({
  visible, categoryKey, categoryLabel, txs, homeCurrency, onClose,
}: Props) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const accounts = useAccountsStore((s) => s.accounts);
  const rates = useExchangeRatesStore((s) => s.rates);
  const loc = numberLocale(language);
  const dateLoc = dateFnsLocale(language);
  const currSym = currencySymbol(homeCurrency);
  const [detailTx, setDetailTx] = useState<UnifiedTransaction | null>(null);

  const shareItems = useMemo((): PlatformShareItem[] => {
    if (!categoryKey || txs.length === 0) return [];
    const map = new Map<string, { accountId: string; accountName: string; total: number; color: string }>();
    for (const tx of txs) {
      const converted = tryConvertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);
      if (converted == null) continue;
      const acc = accounts.find((a) => a.id === tx.account_id);
      const existing = map.get(tx.account_id);
      if (existing) {
        existing.total += converted;
      } else {
        map.set(tx.account_id, {
          accountId: tx.account_id,
          accountName: acc?.displayName ?? acc?.name ?? tx.platform,
          total: converted,
          color: acc?.color ?? PLATFORM_COLORS[tx.platform] ?? theme.accent,
        });
      }
    }
    const items = [...map.values()].filter((p) => p.total > 0);
    const grand = items.reduce((s, p) => s + p.total, 0) || 1;
    return items
      .map((p) => ({ ...p, pct: (p.total / grand) * 100 }))
      .sort((a, b) => b.total - a.total);
  }, [categoryKey, txs, accounts, homeCurrency, rates, theme.accent]);

  function openDetail(txId: string) {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<Record<string, unknown>>(
        'SELECT * FROM transactions WHERE id = ? LIMIT 1',
        [txId],
      );
      if (row) setDetailTx(mapDbRowToTransaction(row));
    } catch {
      /* ignore */
    }
  }

  const fmt = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 0 });

  return (
    <>
      <BottomSheetModal
        visible={visible && !!categoryKey}
        onClose={onClose}
        title={categoryLabel}
        subtitle={t.analyticsCategoryTx}
        scroll
      >
        {shareItems.length > 0 && (
          <PlatformShareBar title={t.analyticsCategoryShare} items={shareItems} />
        )}

        {txs.slice(0, 100).map((tx, i) => {
          const acc = accounts.find((a) => a.id === tx.account_id);
          const amt = tryConvertToHomeCurrency(Math.abs(tx.amount), tx.currency, homeCurrency, rates);
          const amountLabel = amt != null
            ? `${fmt(amt)} ${currSym}`
            : `${fmt(Math.abs(tx.amount))} ${currencySymbol(tx.currency)}`;
          return (
            <Pressable
              key={`${tx.id}-${i}`}
              style={({ pressed }) => [
                styles.txRow,
                { borderBottomColor: theme.border, opacity: pressed ? 0.72 : 1 },
              ]}
              onPress={() => openDetail(tx.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {tx.description || '—'}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>
                  {format(tx.transaction_date, 'd MMM yyyy', { locale: dateLoc })}
                  {' · '}
                  {acc?.displayName ?? acc?.name ?? tx.platform}
                </Text>
              </View>
              <Text style={{ color: theme.expense, fontWeight: '700', fontSize: 13 }}>
                {amountLabel}
              </Text>
            </Pressable>
          );
        })}
      </BottomSheetModal>

      <TxDetailModal
        item={detailTx}
        visible={!!detailTx}
        onClose={() => setDetailTx(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
