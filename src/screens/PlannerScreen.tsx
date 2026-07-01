import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlannedIncomeStore } from '../store/plannedIncomeSlice';
import { useAccountsStore }      from '../store/accountsSlice';
import { useTheme }              from '../theme/ThemeContext';
import { useAppAlert }           from '../components/AppAlert';
import type { PlannedIncome, PlannedIncomeStatus, RecurrenceType } from '../types';
import { format, addDays } from 'date-fns';
import { uk } from 'date-fns/locale';

const STATUS_LABELS: Record<PlannedIncomeStatus, string> = {
  pending:         '⏳ Очікується',
  matched:         '✅ Отримано',
  received_manual: '✅ Підтверджено',
  overdue:         '⚠️ Прострочено',
  cancelled:       '✗ Скасовано',
};

// ─── Planner Card ─────────────────────────────────

function PlannerCard({
  item,
  onConfirm,
  onCancel,
}: {
  item:      PlannedIncome;
  onConfirm: (id: string) => void;
  onCancel:  (id: string) => void;
}) {
  const { theme } = useTheme();

  const STATUS_COLORS: Record<PlannedIncomeStatus, string> = {
    pending:         theme.accent,
    matched:         theme.income,
    received_manual: theme.income,
    overdue:         theme.expense,
    cancelled:       theme.subtext,
  };

  const daysLeft = Math.ceil((item.expectedDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isPending = item.status === 'pending';
  const isOverdue = item.status === 'overdue';

  return (
    <View style={[styles.card, {
      backgroundColor: theme.card,
      borderLeftColor: STATUS_COLORS[item.status],
    }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.cardStatus, { color: STATUS_COLORS[item.status] }]}>
          {STATUS_LABELS[item.status]}
        </Text>
      </View>
      <Text style={[styles.cardAmount, { color: theme.income }]}>
        {item.amount.toLocaleString('uk-UA')} {item.currency}
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
      {item.source && <Text style={[styles.cardSource, { color: theme.subtext }]}>Від: {item.source}</Text>}
      {item.notes  && <Text style={[styles.cardNotes, { color: theme.subtext }]}>{item.notes}</Text>}

      {(isPending || isOverdue) && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.btnConfirm} onPress={() => onConfirm(item.id)}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.income} />
            <Text style={[styles.btnText, { color: theme.income }]}>Отримано</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnCancel} onPress={() => onCancel(item.id)}>
            <Ionicons name="close-circle-outline" size={16} color={theme.expense} />
            <Text style={[styles.btnText, { color: theme.expense }]}>Скасувати</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Add Modal ────────────────────────────────────

function AddPlannerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme }  = useTheme();
  const { addItem } = usePlannedIncomeStore();
  const { accounts } = useAccountsStore();
  const { show, element: alertEl } = useAppAlert();

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
    setAccountId(''); setDaysAhead('7'); setRecurrence('once');
  }

  const visibleAccounts = accounts.filter((a) => a.id !== 'acc_default');

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      {alertEl}
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Нове надходження</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
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

            <Text style={[styles.label, { color: theme.subtext }]}>Джерело</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Від кого / звідки"
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
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
              onPress={handleAdd}
            >
              <Text style={styles.addBtnText}>Додати надходження</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Planner Screen ───────────────────────────────

export function PlannerScreen() {
  const { theme } = useTheme();
  const { items, loadItems, updateStatus, cancelItem } = usePlannedIncomeStore();
  const { loadAccounts } = useAccountsStore();
  const [showModal, setShowModal] = useState(false);
  const { show, element: alertEl } = useAppAlert();

  useEffect(() => {
    loadItems();
    loadAccounts();
  }, []);

  function handleConfirm(id: string) {
    show('Підтвердження', 'Позначити надходження як отримане?', [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Так', onPress: () => updateStatus(id, 'received_manual') },
    ]);
  }

  function handleCancel(id: string) {
    show('Скасування', 'Скасувати планове надходження?', [
      { text: 'Ні', style: 'cancel' },
      { text: 'Скасувати', style: 'destructive', onPress: () => cancelItem(id) },
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
          <PlannerCard item={item} onConfirm={handleConfirm} onCancel={handleCancel} />
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
  cardActions:  { flexDirection: 'row', marginTop: 12, gap: 12 },
  btnConfirm:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnCancel:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
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
