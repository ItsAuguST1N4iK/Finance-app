import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../components/PressableScale';
import { WiggleActionIcon } from '../../components/MotionIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import type { PlannedIncome, PlannedIncomeStatus, Account } from '../../types';
import { format } from 'date-fns';
import { dateFnsLocale, numberLocale } from '../../utils/locale';
import { styles } from './plannerStyles';

export function PlannerCard({
  item,
  account,
  onConfirm,
  onCancel,
  onDelete,
  onEdit,
}: {
  item: PlannedIncome;
  account: Account | undefined;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: PlannedIncome) => void;
}) {
  const { theme, cardSurface } = useTheme();
  const { t, language } = useLanguage();
  const loc = numberLocale(language);
  const dateLoc = dateFnsLocale(language);
  const isExpense = item.planType === 'expense';

  const STATUS_LABELS: Record<PlannedIncomeStatus, string> = {
    pending: t.plannerStatusPending,
    matched: isExpense ? t.plannerStatusPaid : t.plannerStatusReceived,
    received_manual: isExpense ? t.plannerStatusPaid : t.plannerStatusConfirmed,
    overdue: t.plannerStatusOverdue,
    cancelled: t.plannerStatusCancelled,
  };

  const STATUS_COLORS: Record<PlannedIncomeStatus, string> = {
    pending: isExpense ? theme.warning : theme.accent,
    matched: isExpense ? theme.expense : theme.income,
    received_manual: isExpense ? theme.expense : theme.income,
    overdue: theme.expense,
    cancelled: theme.subtext,
  };

  const daysLeft = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isPending = item.status === 'pending';
  const isOverdue = item.status === 'overdue';
  const isDone = item.status === 'matched' || item.status === 'received_manual' || item.status === 'cancelled';

  const amountColor = isExpense ? theme.expense : theme.income;
  const amountSign = isExpense ? '−' : '+';
  const statusColor = STATUS_COLORS[item.status];
  const accountLabel = account ? (account.displayName ?? account.name) : item.accountId;

  return (
    <View style={[styles.card, cardSurface(), { borderColor: theme.border }]}>
      <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.typeIcon, { backgroundColor: amountColor + '22' }]}>
            <Ionicons
              name={isExpense ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={amountColor}
            />
          </View>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.cardStatus, { color: statusColor }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardAmount, { color: amountColor }]}>
        {amountSign}{item.amount.toLocaleString(loc)} {item.currency}
      </Text>

      <View style={styles.cardMeta}>
        <Text style={[styles.cardDate, { color: theme.subtext }]}>
          {format(item.expectedDate, 'd MMMM yyyy', { locale: dateLoc })}
        </Text>
        {isPending && daysLeft > 0 && (
          <Text style={[styles.cardDaysLeft, { color: theme.warning }]}>
            · {t.inDays.replace('{n}', String(daysLeft))}
          </Text>
        )}
        {isOverdue && (
          <Text style={[styles.cardDaysLeft, { color: theme.expense }]}>
            · {t.plannerOverdueShort}
          </Text>
        )}
      </View>

      <View style={[styles.cardAccountRow, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
        <Ionicons name="card-outline" size={12} color={theme.subtext} />
        <Text style={[styles.cardAccount, { color: theme.subtext }]} numberOfLines={1}>
          {accountLabel}
        </Text>
      </View>

      {item.source ? (
        <Text style={[styles.cardSource, { color: theme.subtext }]}>
          {isExpense ? t.plannerSourceTo : t.plannerSourceFrom} {item.source}
        </Text>
      ) : null}
      {item.notes ? (
        <Text style={[styles.cardNotes, { color: theme.subtext }]}>{item.notes}</Text>
      ) : null}

      {(isPending || isOverdue || isDone) && (
        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
          {(isPending || isOverdue) && (
            <>
              <PressableScale style={styles.btnConfirm} onPress={() => onConfirm(item.id)}>
                <Ionicons name="checkmark-circle" size={17} color={isExpense ? theme.expense : theme.income} />
                <Text style={[styles.btnText, { color: isExpense ? theme.expense : theme.income }]}>
                  {isExpense ? t.plannerPaid : t.plannerReceived}
                </Text>
              </PressableScale>
              <PressableScale style={styles.btnCancel} onPress={() => onCancel(item.id)}>
                <Ionicons name="close-circle-outline" size={16} color={theme.subtext} />
                <Text style={[styles.btnText, { color: theme.subtext }]}>{t.cancel}</Text>
              </PressableScale>
              <WiggleActionIcon
                name="pencil-outline"
                size={15}
                color={theme.accent}
                onPress={() => onEdit(item)}
                style={[styles.btnEdit, { borderColor: theme.border }]}
              />
            </>
          )}
          {isDone && (
            <WiggleActionIcon
              name="trash-outline"
              size={15}
              color={theme.accent}
              onPress={() => onDelete(item.id)}
              style={[styles.btnDelete, { borderColor: theme.border }]}
            />
          )}
        </View>
      )}
    </View>
  );
}
