import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../components/PressableScale';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { usePlannedIncomeStore } from '../../store/plannedIncomeSlice';
import { useAccountsStore } from '../../store/accountsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppAlert } from '../../components/AppAlert';
import type { PlannedIncome, RecurrenceType } from '../../types';
import { addDays } from 'date-fns';
import { styles } from './plannerStyles';
import { commonStyles } from '../../theme/commonStyles';

// ─── Add / Edit Modal ─────────────────────────────

export function PlannerFormModal({
  visible,
  editItem,
  onClose,
}: {
  visible: boolean;
  editItem: PlannedIncome | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { addItem, updateItem } = usePlannedIncomeStore();
  const { accounts } = useAccountsStore();
  const { show, element: alertEl } = useAppAlert();

  const [planType, setPlanType] = useState<'income' | 'expense'>('income');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('once');
  const [daysAhead, setDaysAhead] = useState('7');

  const isEdit = editItem !== null;

  useEffect(() => {
    if (visible && editItem) {
      setPlanType(editItem.planType);
      setName(editItem.name);
      setAmount(String(editItem.amount));
      setCurrency(editItem.currency);
      setSource(editItem.source ?? '');
      setNotes(editItem.notes ?? '');
      setAccountId(editItem.accountId);
      setRecurrence(editItem.recurrence);
      const diff = Math.ceil((editItem.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
      setDaysAhead(String(Math.max(1, diff)));
    } else if (visible && !editItem) {
      setPlanType('income');
      setName(''); setAmount(''); setSource(''); setNotes('');
      setAccountId(''); setDaysAhead('7'); setRecurrence('once');
      if (accounts.length > 0) setAccountId(accounts[0].id);
    }
  }, [visible, editItem]);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    once: t.plannerFreqOnce, weekly: t.plannerFreqWeekly, monthly: t.plannerFreqMonthly, custom: t.plannerFreqCustom,
  };

  function handleSave() {
    if (!name.trim() || !amount) {
      show(t.error, t.plannerFillRequired);
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      show(t.error, t.plannerFillRequired);
      return;
    }
    const resolvedAccountId = accountId || accounts.find((a) => a.id === 'acc_default')?.id || accounts[0]?.id;
    if (!resolvedAccountId) {
      show(t.error, t.plannerAccountError);
      return;
    }
    const expectedDate = addDays(new Date(), parseInt(daysAhead, 10) || 7).setHours(9, 0, 0, 0);

    if (isEdit && editItem) {
      updateItem(editItem.id, {
        accountId: resolvedAccountId,
        planType,
        name: name.trim(),
        amount: parsedAmount,
        currency,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
        expectedDate,
        recurrence,
      });
    } else {
      addItem({
        accountId: resolvedAccountId,
        planType,
        name: name.trim(),
        amount: parsedAmount,
        currency,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
        expectedDate,
        notifyDaysBefore: 1,
        recurrence,
      });
    }

    onClose();
  }

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');
  const isExpense = planType === 'expense';
  const title = isEdit
    ? t.plannerEditTitle
    : (isExpense ? t.plannerAddExpense : t.plannerAddIncome);

  return (
    <>
      {alertEl}
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title={title}
        scroll
        footer={(
          <PressableScale
            style={[
              commonStyles.footerBtnPrimarySolo,
              { backgroundColor: isExpense ? theme.expense : theme.income },
            ]}
            onPress={handleSave}
          >
            <Text style={[commonStyles.footerBtnTextPrimary, { color: theme.onAccent }]}>
              {isEdit ? t.save : (isExpense ? t.plannerAddExpense : t.plannerAddIncome)}
            </Text>
          </PressableScale>
        )}
      >
        <View style={[styles.typeToggleRow, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
          <PressableScale
            style={[styles.typeBtn, !isExpense && { backgroundColor: theme.income }]}
            onPress={() => setPlanType('income')}
          >
            <Ionicons name="arrow-down-circle-outline" size={16} color={!isExpense ? theme.onAccent : theme.subtext} />
            <Text style={[styles.typeBtnText, { color: !isExpense ? theme.onAccent : theme.subtext }]}>
              {t.plannerIncome}
            </Text>
          </PressableScale>
          <PressableScale
            style={[styles.typeBtn, isExpense && { backgroundColor: theme.expense }]}
            onPress={() => setPlanType('expense')}
          >
            <Ionicons name="arrow-up-circle-outline" size={16} color={isExpense ? theme.onAccent : theme.subtext} />
            <Text style={[styles.typeBtnText, { color: isExpense ? theme.onAccent : theme.subtext }]}>
              {t.plannerExpense}
            </Text>
          </PressableScale>
        </View>

        <Text style={[styles.label, { color: theme.subtext }]}>Назва *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder={t.plannerNamePlaceholder}
          placeholderTextColor={theme.subtext}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: theme.subtext }]}>Сума *</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="0.00"
            placeholderTextColor={theme.subtext}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <PressableScale
            style={[styles.currencyBtn, { backgroundColor: theme.accent }]}
            onPress={() => setCurrency(currency === 'UAH' ? 'USD' : currency === 'USD' ? 'EUR' : 'UAH')}
          >
            <Text style={[styles.currencyText, { color: theme.onAccent }]}>{currency}</Text>
          </PressableScale>
        </View>

        {visibleAccounts.length > 0 && (
          <>
            <Text style={[styles.label, { color: theme.subtext }]}>{t.plannerAccount}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {visibleAccounts.map((a) => (
                <PressableScale
                  key={a.id}
                  style={[styles.accountBtn,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                    a.id === accountId && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                  onPress={() => setAccountId(a.id)}
                >
                  <Text style={[styles.accountBtnText, { color: theme.text },
                    a.id === accountId && { color: theme.onAccent }]}>
                    {a.displayName ?? a.name}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.label, { color: theme.subtext }]}>Очікується через (дні)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="7"
          placeholderTextColor={theme.subtext}
          value={daysAhead}
          onChangeText={setDaysAhead}
          keyboardType="number-pad"
        />

        <Text style={[styles.label, { color: theme.subtext }]}>
          {isExpense ? t.plannerSourceLabelExpense : t.plannerSourceLabelIncome}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder={isExpense ? t.plannerSourcePlaceholderExpense : t.plannerSourcePlaceholderIncome}
          placeholderTextColor={theme.subtext}
          value={source}
          onChangeText={setSource}
        />

        <Text style={[styles.label, { color: theme.subtext }]}>Нотатки</Text>
        <TextInput
          style={[styles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder={t.plannerCommentPlaceholder}
          placeholderTextColor={theme.subtext}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={[styles.label, { color: theme.subtext }]}>Повторення</Text>
        <View style={styles.recurrenceRow}>
          {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((r) => (
            <PressableScale
              key={r}
              style={[styles.recBtn, { borderColor: theme.border },
                recurrence === r && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => setRecurrence(r)}
            >
              <Text style={[styles.recBtnText, { color: theme.subtext },
                recurrence === r && { color: theme.onAccent }]}>
                {RECURRENCE_LABELS[r]}
              </Text>
            </PressableScale>
          ))}
        </View>
      </BottomSheetModal>
    </>
  );
}
