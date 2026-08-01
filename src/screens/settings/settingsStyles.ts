import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../theme';
import { radius, space, stroke, type } from '../../theme/tokens';

export function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    hintText: { color: t.subtext, fontSize: 12, lineHeight: 16 },
    glassPreview: { borderRadius: radius.md, borderWidth: stroke.width, padding: space[3] },

    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    themeBtn: {
      width: '48%', height: 80, alignItems: 'center', justifyContent: 'center',
      padding: space[2.5], backgroundColor: t.cardAlt, borderRadius: radius.md,
      borderWidth: stroke.width, borderColor: t.border, gap: 6,
    },
    themeDot: { width: 26, height: 26, borderRadius: 13 },
    themeBtnLabel: { color: t.subtext, fontSize: 10, fontWeight: '600', textAlign: 'center' },
    accentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2.5] },
    accentDot: { width: 34, height: 34, borderRadius: 17 },
    accentDotActive: { borderWidth: stroke.width + 1, borderColor: t.onAccent },

    langRow: { flexDirection: 'row', gap: space[2.5] },
    langBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: space[3], borderRadius: radius.md, borderWidth: stroke.width,
      borderColor: t.border, backgroundColor: t.cardAlt,
    },
    langBtnText: { fontSize: 14, fontWeight: '600' },

    currenciesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    currencyChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: space[3], paddingVertical: 7, borderRadius: radius.md, borderWidth: stroke.width,
    },
    currencyChipText: { fontSize: 13, fontWeight: '600' },

    noteBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: space[2],
      borderRadius: radius.md, borderWidth: stroke.width, padding: space[2.5],
    },
    noteTitle: { ...type.meta, fontWeight: '700', marginBottom: 2 },
    noteText: { fontSize: 12, lineHeight: 16 },

    syncBtn: {
      flexDirection: 'row', alignItems: 'center', gap: space[2],
      backgroundColor: t.accent, borderRadius: radius.md, padding: space[3],
      marginBottom: space[3], justifyContent: 'center',
    },
    syncBtnText: { color: t.onAccent, fontSize: 15, fontWeight: '600' },

    tokenBlock: { backgroundColor: t.cardAlt, borderRadius: radius.md, padding: 14, marginBottom: space[2.5] },
    tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    tokenTitle: { color: t.text, fontSize: 14, fontWeight: '600' },
    savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    savedText: { fontSize: 12 },
    tokenHint: { color: t.subtext, fontSize: 12, marginBottom: space[2.5] },
    inputRow: { flexDirection: 'row', gap: space[2], marginBottom: space[2] },
    input: {
      backgroundColor: t.inputBg, borderRadius: radius.md, padding: space[3],
      color: t.text, fontSize: 14, borderWidth: stroke.width, borderColor: t.border,
    },
    eyeBtn: {
      backgroundColor: t.inputBg, borderRadius: radius.md, padding: space[3],
      borderWidth: stroke.width, borderColor: t.border,
    },
    saveBtn: {
      backgroundColor: t.accent, borderRadius: radius.md, padding: space[3],
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: space[2],
    },
    saveBtnText: { color: t.onAccent, fontWeight: '600' },
    viewTokenBtn: {
      flexDirection: 'row', alignItems: 'center', gap: space[2], borderRadius: radius.md,
      borderWidth: stroke.width, padding: space[2.5], marginBottom: space[2], justifyContent: 'center',
    },
    viewTokenText: { fontSize: 13, fontWeight: '600' },
    storedTokenBox: {
      flexDirection: 'row', alignItems: 'center', gap: space[2], borderRadius: radius.md,
      borderWidth: stroke.width, padding: space[2.5], marginBottom: space[2],
    },
    storedTokenValue: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    deleteBtnText: { fontSize: 13 },
    instrToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 4 },
    instrToggleText: { fontSize: 12, fontWeight: '600' },
    instrBox: { borderRadius: radius.md, borderWidth: stroke.width, padding: space[2.5], marginBottom: space[2] },
    instrText: { fontSize: 12, lineHeight: 18 },

    accountRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: t.bg, borderRadius: radius.md, padding: space[3],
      marginBottom: space[2], gap: space[2.5],
    },
    accountColorDot: { width: 10, height: 10, borderRadius: 5 },
    accountName: { color: t.text, fontSize: 14, fontWeight: '600' },
    accountMeta: { color: t.subtext, fontSize: 12, marginTop: 2 },
    accountRight: { alignItems: 'flex-end', gap: space[2] },
    accountBalance: { color: t.text, fontSize: 13 },
    emptyAccounts: { alignItems: 'center', padding: space[5], gap: space[2] },
    emptyAccountsText: { color: t.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    dangerBlock: {
      flexDirection: 'row', alignItems: 'center', gap: space[3],
      borderRadius: radius.md, borderWidth: stroke.width, padding: 14,
    },
    dangerTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    dangerHint: { fontSize: 12 },
    dangerBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md,
      borderWidth: stroke.width, paddingHorizontal: space[2.5], paddingVertical: space[2],
    },
    dangerBtnText: { fontSize: 13, fontWeight: '600' },

    /** Tight under last section — not pushed toward the tab bar */
    aboutSection: { marginTop: space[2], alignItems: 'center', paddingTop: space[1], paddingBottom: 0 },
    aboutTitle: { color: t.subtext, fontSize: 13, fontWeight: '600', marginBottom: 2 },
    aboutText: { color: t.subtext, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  });
}

export type SettingsStyles = ReturnType<typeof makeStyles>;
