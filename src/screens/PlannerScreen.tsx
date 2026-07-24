import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, ScrollView, LayoutAnimation, Platform,
  KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlannedIncomeStore } from '../store/plannedIncomeSlice';
import { useAccountsStore }      from '../store/accountsSlice';
import { useTheme }              from '../theme/ThemeContext';
import { useLanguage }           from '../i18n/LanguageContext';
import { useAppAlert }           from '../components/AppAlert';
import type { PlannedIncome, PlannedIncomeStatus, RecurrenceType, Account } from '../types';
import { format, addDays } from 'date-fns';
import { uk } from 'date-fns/locale';


// ─── Planner Card ─────────────────────────────────

function PlannerCard({
  item,
  account,
  onConfirm,
  onCancel,
  onDelete,
  onEdit,
}: {
  item:      PlannedIncome;
  account:   Account | undefined;
  onConfirm: (id: string) => void;
  onCancel:  (id: string) => void;
  onDelete:  (id: string) => void;
  onEdit:    (item: PlannedIncome) => void;
}) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();

  const isExpense = item.planType === 'expense';

  const STATUS_LABELS: Record<PlannedIncomeStatus, string> = {
    pending:         t.plannerStatusPending,
    matched:         isExpense ? t.plannerStatusPaid : t.plannerStatusReceived,
    received_manual: isExpense ? t.plannerStatusPaid : t.plannerStatusConfirmed,
    overdue:         t.plannerStatusOverdue,
    cancelled:       t.plannerStatusCancelled,
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

  const accountLabel = account ? (account.displayName ?? account.name) : item.accountId;

  return (
    <View style={[styles.card, cardSurface(), {
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
          <Text style={[styles.cardDaysLeft, { color: theme.warning }]}>
            {t.inDays.replace('{n}', String(daysLeft))}
          </Text>
        )}
        {isOverdue && <Text style={[styles.cardDaysLeft, { color: theme.expense }]}>{t.plannerOverdueShort}</Text>}
      </View>

      {/* Account name */}
      <View style={[styles.cardAccountRow, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
        <Ionicons name="card-outline" size={12} color={theme.subtext} />
        <Text style={[styles.cardAccount, { color: theme.subtext }]} numberOfLines={1}>
          {accountLabel}
        </Text>
      </View>

      {item.source && (
        <Text style={[styles.cardSource, { color: theme.subtext }]}>
          {isExpense ? t.plannerSourceTo : t.plannerSourceFrom} {item.source}
        </Text>
      )}
      {item.notes && <Text style={[styles.cardNotes, { color: theme.subtext }]}>{item.notes}</Text>}

      <View style={styles.cardActions}>
        {(isPending || isOverdue) && (
          <>
            <TouchableOpacity style={styles.btnConfirm} onPress={() => onConfirm(item.id)} activeOpacity={0.75}>
              <Ionicons name="checkmark-circle-outline" size={16} color={isExpense ? theme.expense : theme.income} />
              <Text style={[styles.btnText, { color: isExpense ? theme.expense : theme.income }]}>
                {isExpense ? t.plannerPaid : t.plannerReceived}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => onCancel(item.id)} activeOpacity={0.75}>
              <Ionicons name="close-circle-outline" size={16} color={theme.subtext} />
              <Text style={[styles.btnText, { color: theme.subtext }]}>Скасувати</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnEdit, { borderColor: theme.border, marginLeft: 'auto' as any }]}
              onPress={() => onEdit(item)}
              activeOpacity={0.75}
            >
              <Ionicons name="pencil-outline" size={15} color={theme.accent} />
            </TouchableOpacity>
          </>
        )}
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

// ─── Add / Edit Modal ─────────────────────────────

function PlannerFormModal({
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
                <Text style={styles.currencyText}>{currency}</Text>
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
                        a.id === accountId && { color: '#fff' }]}>
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
                    recurrence === r && { color: '#fff' }]}>
                    {RECURRENCE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: isExpense ? theme.expense : theme.income }]}
              onPress={handleSave}
            >
              <Text style={styles.addBtnText}>
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

// ─── Planner Screen ───────────────────────────────

export function PlannerScreen() {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { items, loadItems, updateStatus, cancelItem, deleteItem } = usePlannedIncomeStore();
  const { accounts, loadAccounts } = useAccountsStore();
  const [showModal, setShowModal]   = useState(false);
  const [editItem,  setEditItem]    = useState<PlannedIncome | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { show, element: alertEl } = useAppAlert();

  useEffect(() => {
    loadItems();
    loadAccounts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
    loadAccounts();
    setRefreshing(false);
  }, []);

  function handleConfirm(id: string) {
    const item = items.find((i) => i.id === id);
    const isExpense = item?.planType === 'expense';
    show(t.plannerConfirmTitle, isExpense ? t.plannerMarkPaidConfirm : t.plannerMarkReceivedConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.yes,
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          updateStatus(id, 'received_manual');
        },
      },
    ]);
  }

  function handleCancel(id: string) {
    show(t.plannerCancelTitle, t.plannerCancelConfirm, [
      { text: t.no, style: 'cancel' },
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

  function handleEdit(item: PlannedIncome) {
    setEditItem(item);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditItem(null);
  }

  // Build a map of accountId -> Account for quick lookup
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const done    = items.filter((i) => i.status === 'matched' || i.status === 'received_manual');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      {alertEl}
      <FlatList
        data={[...pending, ...done]}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        renderItem={({ item }) => (
          <PlannerCard
            item={item}
            account={accountMap.get(item.accountId)}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Планових записів немає</Text>
            <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
              Додайте очікувані надходження або витрати
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => { setEditItem(null); setShowModal(true); }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PlannerFormModal
        visible={showModal}
        editItem={editItem}
        onClose={closeModal}
      />
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
  cardMeta:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardDate:     { fontSize: 13 },
  cardDaysLeft: { fontSize: 13, marginLeft: 8 },
  cardAccountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, alignSelf: 'flex-start', marginBottom: 6,
  },
  cardAccount:  { fontSize: 12 },
  cardSource:   { fontSize: 13, marginTop: 2 },
  cardNotes:    { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  cardActions:  { flexDirection: 'row', marginTop: 12, gap: 12, alignItems: 'center' },
  btnConfirm:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnCancel:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnEdit: {
    borderRadius: 8, borderWidth: 1,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  btnDelete: {
    borderRadius: 8, borderWidth: 1,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '500' },

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
