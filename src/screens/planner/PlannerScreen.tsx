import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlannedIncomeStore } from '../../store/plannedIncomeSlice';
import { useAccountsStore } from '../../store/accountsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppAlert } from '../../components/AppAlert';
import type { PlannedIncome, Account } from '../../types';
import { PlannerCard } from './PlannerCard';
import { PlannerFormModal } from './PlannerFormModal';
import { styles } from './plannerStyles';
import { layout } from '../../theme/tokens';
import { SpinAddButton } from '../../components/MotionIcons';
import { ScreenEnter } from '../../components/ScreenEnter';
import { AppRefreshControl } from '../../components/AppRefreshControl';
import { EmptyState } from '../../components/EmptyState';

export function PlannerScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { items, loadItems, updateStatus, cancelItem, deleteItem } = usePlannedIncomeStore();
  const { accounts, loadAccounts } = useAccountsStore();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PlannedIncome | null>(null);
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
    setTimeout(() => setRefreshing(false), 600);
  }, [loadItems, loadAccounts]);

  function handleConfirm(id: string) {
    const item = items.find((i) => i.id === id);
    const isExpense = item?.planType === 'expense';
    show(t.plannerConfirmTitle, isExpense ? t.plannerMarkPaidConfirm : t.plannerMarkReceivedConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.yes,
        onPress: () => {
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

  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const pending = items.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const done = items.filter((i) => i.status === 'matched' || i.status === 'received_manual');
  const listData = [...pending, ...done];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      {alertEl}
      <ScreenEnter>
        <FlatList
          data={listData}
          keyExtractor={(i) => i.id}
          refreshControl={
            <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item, index }) => (
            <View>
              {index === 0 && pending.length > 0 && (
                <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
                  {t.plannerStatusPending}
                </Text>
              )}
              {index === pending.length && done.length > 0 && (
                <Text style={[styles.sectionLabel, { color: theme.subtext, marginTop: 8 }]}>
                  {t.plannerStatusReceived}
                </Text>
              )}
              <PlannerCard
                item={item}
                account={accountMap.get(item.accountId)}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={t.plannerEmptyTitle}
              subtitle={t.plannerEmptyHint}
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: layout.listBottom }}
        />
      </ScreenEnter>

      <SpinAddButton
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => { setEditItem(null); setShowModal(true); }}
        color={theme.onAccent}
      />

      <PlannerFormModal
        visible={showModal}
        editItem={editItem}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}
