import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, ScrollView, LayoutAnimation, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlannedIncomeStore } from '../store/plannedIncomeSlice';
import { useAccountsStore }      from '../store/accountsSlice';
import { useTheme }              from '../theme/ThemeContext';
import { useLanguage }           from '../i18n/LanguageContext';
import { useAppAlert }           from '../components/AppAlert';
import type { PlannedIncome, PlannedIncomeStatus, RecurrenceType } from '../types';
import { format, addDays } from 'date-fns';
import { uk } from 'date-fns/locale';


// ─── Planner Card ─────────────────────────────────

function PlannerCard({
  item,
  onConfirm,
  onCancel,
  onDelete,
}: {
  item:      PlannedIncome;
  onConfirm: (id: string) => void;
  onCancel:  (id: string) => void;
  onDelete:  (id: string) => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();

  const isExpense = item.planType === 'expense';

  const STATUS_LABELS: Record<PlannedIncomeStatus, string> = {
    pending:         '⏳ Очікується',
    matched:         isExpense ? '✅ Оплачено' : '✅ Отримано',
    received_manual: isExpense ? '✅ Оплачено' : '✅ Підтверджено',
    overdue:         '⚠️ Прострочено',
    cancelled:       '✗ Скасовано',
  };

  const STATUS_COLORS: Record<PlannedIncomeStatus, string> = {
    pending:         isExpense ? theme.warning : theme.accent,
    matched:         isExpense ? theme.expense : theme.income,
    received_manual: isExpense ? theme.expense : theme.income,
    overdue:         theme.expense,
    cancelled:       theme.subtext,
  };

  const daysLeft  = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isPending = item.status === 'pending';
  const isOverdue = item.status === 'overdue';
  const isDone    = item.status === 'matched' || item.status === 'received_manual' || item.status === 'cancelled';

  const amountColor = isExpense ? theme.expense : theme.income;
  const amountSign  = isExpense ? '−' : '+';

  return (
    <View style={[styles.card, {
      backgroundColor: theme.card,
      borderLeftColor: STATUS_COLORS[item.status],
    }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons
            name={isExpense ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
            size={15}
            color={amountColor}
          />
          <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
        </View>
        <Text style={[styles.cardStatus, { color: STATUS_COLORS[item.status] }]}>
          {STATUS_LABELS[item.status]}
        </Text>
      </View>
      <Text style={[styles.cardAmount, { color: amountColor }]}>
        {amountSign}{item.amount.toLocaleString('uk-UA')} {item.currency}
      </Text>
      <View style={styles.cardMeta}>
        <Text style={[styles.cardDate, { color: theme.subtext }]}>
          {format(item.expectedDate, 'd MMMM yyyy', { locale: uk })}
        </Text>
        {isPending && daysLeft > 0 && (
          <Text style={[styles.cardDaysLeft, { color: theme.warning }]}>через {daysLeft} дн.</Text>
        )}
        {isOverdue && <Text style={[styles.cardDaysLeft, { color: theme.expense }]}>прострочено</Text>}
      </View>
      {item.source && (
        <Text style={[styles.cardSource, { color: theme.subtext }]}>
          {isExpense ? 'Куди:' : 'Від:'} {item.source}
        </Text>
      )}
      {item.notes && <Text style={[styles.cardNotes, { color: theme.subtext }]}>{item.notes}</Text>}

      <View style={styles.cardActions}>
        {(isPending || isOverdue) && (
          <>
            <TouchableOpacity style={styles.btnConfirm} onPress={() => onConfirm(item.id)} activeOpacity={0.75}>
              <Ionicons name="checkmark-circle-outline" size={16} color={isExpense ? theme.expense : theme.income} />
              <Text style={[styles.btnText, { color: isExpense ? theme.expense : theme.income }]}>
                {isExpense ? t.plannerPaid : 'Отримано'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => onCancel(item.id)} activeOpacity={0.75}>
              <Ionicons name="close-circle-outline" size={16} color={theme.subtext} />
              <Text style={[styles.btnText, { color: theme.subtext }]}>Скасувати</Text>
            </TouchableOpacity>
          </>
        )}
        {/* Trash icon only for completed/cancelled items */}
        {isDone && (
          <TouchableOpacity
            style={[styles.btnDelete, { borderColor: theme.border, marginLeft: 'auto' as any }]}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={15} color={theme.expense} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Add Modal ────────────────────────────────────

function AddPlannerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme }  = useTheme();
  const { t }      = useLanguage();
  const { addItem } = usePlannedIncomeStore();
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

  // Auto-select the first available account (including default)
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    once: 'Один раз', weekly: 'Щотижня', monthly: 'Щомісяця', custom: 'Кастомно',
  };

  function handleAdd() {
    if (!name.trim() || !amount) {
      show('Помилка', 'Заповніть назву та суму.');
      return;
    }

    // Resolve accountId — fall back to default if none selected
    const resolvedAccountId = accountId || accounts.find((a) => a.id === 'acc_default')?.id || accounts[0]?.id;
    if (!resolvedAccountId) {
      show('Помилка', 'Не вдалося визначити рахунок. Спробуйте ще раз.');
      return;
    }

    const expectedDate = addDays(new Date(), parseInt(daysAhead, 10) || 7).setHours(9, 0, 0, 0);
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

    onClose();
    setName(''); setAmount(''); setSource(''); setNotes('');
    setAccountId(''); setDaysAhead('7'); setRecurrence('once'); setPlanType('income');
  }

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');

  const isExpense = planType === 'expense';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      {alertEl}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isExpense ? t.plannerAddExpense : t.plannerAddIncome}
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
              <Ionicons name="arrow-down-circle-outline" size={16} color={!isExpense ? '#fff' : theme.subtext} />
              <Text style={[styles.typeBtnText, { color: !isExpense ? '#fff' : theme.subtext }]}>
                {t.plannerIncome}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, isExpense && { backgroundColor: theme.expense }]}
              onPress={() => setPlanType('expense')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color={isExpense ? '#fff' : theme.subtext} />
              <Text style={[styles.typeBtnText, { color: isExpense ? '#fff' : theme.subtext }]}>
                {t.plannerExpense}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: theme.subtext }]}>Назва *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Зарплата, фріланс..."
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
                <Text style={styles.currencyText}>{currency}</Text>
              </TouchableOpacity>
            </View>

            {/* Account picker — only show if real accounts exist */}
            {visibleAccounts.length > 0 && (
              <>
                <Text style={[styles.label, { color: theme.subtext }]}>Рахунок</Text>
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
                        a.id === accountId && { color: '#fff' }]}>
                        {a.name}
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
              {isExpense ? 'Куди / на що' : 'Джерело'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder={isExpense ? 'Оренда, підписка...' : 'Від кого / звідки'}
              placeholderTextColor={theme.subtext}
              value={source}
              onChangeText={setSource}
            />

            <Text style={[styles.label, { color: theme.subtext }]}>Нотатки</Text>
            <TextInput
              style={[styles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Коментар..."
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
                    recurrence === r && { color: '#fff' }]}>
                    {RECURRENCE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: isExpense ? theme.expense : theme.income }]}
              onPress={handleAdd}
            >
              <Text style={styles.addBtnText}>
                {isExpense ? t.plannerAddExpense : t.plannerAddIncome}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Planner Screen ───────────────────────────────

export function PlannerScreen() {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { items, loadItems, updateStatus, cancelItem, deleteItem } = usePlannedIncomeStore();
  const { loadAccounts } = useAccountsStore();
  const [showModal, setShowModal] = useState(false);
  const { show, element: alertEl } = useAppAlert();

  useEffect(() => {
    loadItems();
    loadAccounts();
  }, []);

  function handleConfirm(id: string) {
    show('Підтвердження', 'Позначити надходження як отримане?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: 'Так',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          updateStatus(id, 'received_manual');
        },
      },
    ]);
  }

  function handleCancel(id: string) {
    show('Скасування', 'Скасувати планове надходження?', [
      { text: 'Ні', style: 'cancel' },
      {
        text: t.cancel, style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          cancelItem(id);
        },
      },
    ]);
  }

  function handleDelete(id: string) {
    show(t.plannerDeleteConfirm, t.plannerDeleteHint, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          deleteItem(id);
        },
      },
    ]);
  }

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const done    = items.filter((i) => i.status === 'matched' || i.status === 'received_manual');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      {alertEl}
      <FlatList
        data={[...pending, ...done]}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <PlannerCard item={item} onConfirm={handleConfirm} onCancel={handleCancel} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Планових надходжень немає</Text>
            <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
              Додайте очікувані надходження — зарплату, оплати від клієнтів, дивіденди
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddPlannerModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardName:     { fontSize: 16, fontWeight: '600', flex: 1 },
  cardStatus:   { fontSize: 12, fontWeight: '500' },
  cardAmount:   { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardDate:     { fontSize: 13 },
  cardDaysLeft: { fontSize: 13, marginLeft: 8 },
  cardSource:   { fontSize: 13, marginTop: 4 },
  cardNotes:    { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  cardActions:  { flexDirection: 'row', marginTop: 12, gap: 12, alignItems: 'center' },
  btnConfirm:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnCancel:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnDelete:    {
    marginLeft: 'auto',
    borderRadius: 8, borderWidth: 1,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  btnText:      { fontSize: 13, fontWeight: '500' },

  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:    { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  fab: {
    position: 'absolute', right: 20, bottom: 90,
    borderRadius: 30, width: 56, height: 56,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '92%',
  },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeToggleRow:   { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  typeBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  typeBtnText:     { fontSize: 14, fontWeight: '600' },
  modalTitle:   { fontSize: 18, fontWeight: '700' },
  label:        { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1,
  },
  amountRow:    { flexDirection: 'row', gap: 8 },
  currencyBtn:  { borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  currencyText: { color: '#fff', fontWeight: '700' },
  accountBtn: {
    borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 8, marginRight: 8, borderWidth: 1,
  },
  accountBtnText: { fontSize: 14 },
  recurrenceRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recBtn: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1,
  },
  recBtnText: { fontSize: 13 },
  addBtn: {
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 20, marginBottom: 10,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
