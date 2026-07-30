import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlannedIncomeStore } from '../../store/plannedIncomeSlice';
import { useAccountsStore } from '../../store/accountsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppAlert } from '../../components/AppAlert';
import type { PlannedIncome, RecurrenceType } from '../../types';
import { addDays } from 'date-fns';
import { styles } from './plannerStyles';

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
  const { theme, cardSurface }  = useTheme();
  const { t }      = useLanguage();
  const { addItem, updateItem } = usePlannedIncomeStore();
  const { accounts } = useAccountsStore();
  const { show, element: alertEl } = useAppAlert();

  const [planType,   setPlanType]   = useState<'income' | 'expense'>('income');
  const [name,       setName]       = useState('');
  const [amount,     setAmount]     = useState('');
  const [currency,   setCurrency]   = useState('UAH');
  const [source,     setSource]     = useState('');
  const [notes,      setNotes]      = useState('');
  const [accountId,  setAccountId]  = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('once');
  const [daysAhead,  setDaysAhead]  = useState('7');

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
        amount: parseFloat(amount.replace(',', '.')),
        currency,
        source: source.trim() || undefined,
        notes:  notes.trim() || undefined,
        expectedDate,
        recurrence,
      });
    } else {
      addItem({
        accountId: resolvedAccountId,
        planType,
        name: name.trim(),
        amount: parseFloat(amount.replace(',', '.')),
        currency,
        source: source.trim() || undefined,
        notes:  notes.trim() || undefined,
        expectedDate,
        notifyDaysBefore: 1,
        recurrence,
      });
    }

    onClose();
  }

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');
  const isExpense = planType === 'expense';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      {alertEl}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalCard, cardSurface()]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isEdit ? t.plannerEditTitle : (isExpense ? t.plannerAddExpense : t.plannerAddIncome)}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Plan type toggle */}
          <View style={[styles.typeToggleRow, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.typeBtn, !isExpense && { backgroundColor: theme.income }]}
              onPress={() => setPlanType('income')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color={!isExpense ? theme.onAccent : theme.subtext} />
              <Text style={[styles.typeBtnText, { color: !isExpense ? theme.onAccent : theme.subtext }]}>
                {t.plannerIncome}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, isExpense && { backgroundColor: theme.expense }]}
              onPress={() => setPlanType('expense')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color={isExpense ? theme.onAccent : theme.subtext} />
              <Text style={[styles.typeBtnText, { color: isExpense ? theme.onAccent : theme.subtext }]}>
                {t.plannerExpense}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              <TouchableOpacity
                style={[styles.currencyBtn, { backgroundColor: theme.accent }]}
                onPress={() => setCurrency(currency === 'UAH' ? 'USD' : currency === 'USD' ? 'EUR' : 'UAH')}
              >
                <Text style={[styles.currencyText, { color: theme.onAccent }]}>{currency}</Text>
              </TouchableOpacity>
            </View>

            {/* Account picker */}
            {visibleAccounts.length > 0 && (
              <>
                <Text style={[styles.label, { color: theme.subtext }]}>{t.plannerAccount}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {visibleAccounts.map((a) => (
                    <TouchableOpacity
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
                    </TouchableOpacity>
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
                <TouchableOpacity
                  key={r}
                  style={[styles.recBtn, { borderColor: theme.border },
                    recurrence === r && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                  onPress={() => setRecurrence(r)}
                >
                  <Text style={[styles.recBtnText, { color: theme.subtext },
                    recurrence === r && { color: theme.onAccent }]}>
                    {RECURRENCE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: isExpense ? theme.expense : theme.income }]}
              onPress={handleSave}
            >
              <Text style={[styles.addBtnText, { color: theme.onAccent }]}>
                {isEdit ? t.save : (isExpense ? t.plannerAddExpense : t.plannerAddIncome)}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
