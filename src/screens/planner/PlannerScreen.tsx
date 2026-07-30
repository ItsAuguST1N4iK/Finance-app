import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, LayoutAnimation, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlannedIncomeStore } from '../../store/plannedIncomeSlice';
import { useAccountsStore } from '../../store/accountsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppAlert } from '../../components/AppAlert';
import type { PlannedIncome, Account } from '../../types';
import { PlannerCard } from './PlannerCard';
import { PlannerFormModal } from './PlannerFormModal';
import { styles } from './plannerStyles';

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
    loadAccounts(true);
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
        <Ionicons name="add" size={28} color={theme.onAccent} />
      </TouchableOpacity>

      <PlannerFormModal
        visible={showModal}
        editItem={editItem}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}
