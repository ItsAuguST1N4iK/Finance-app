import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
  currencyText: { fontWeight: '700' },
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
  addBtnText: { fontSize: 16, fontWeight: '700' },
});

