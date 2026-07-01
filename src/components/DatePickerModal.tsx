import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { AppTheme } from '../theme';

interface Props {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  title?: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Monday … 6=Sunday index for the first day of the month */
function firstWeekdayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

type Step = 'year' | 'month' | 'day';

const YEAR_RANGE = 10;
const CURRENT_YEAR = new Date().getFullYear();

export function DatePickerModal({ visible, value, onClose, onConfirm, title }: Props) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { height: SCREEN_H } = useWindowDimensions();

  const now = value ?? new Date();
  const [step,     setStep]     = useState<Step>('year');
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selDay,   setSelDay]   = useState(now.getDate());

  useEffect(() => {
    if (visible) {
      const d = value ?? new Date();
      setStep('year');
      setSelYear(d.getFullYear());
      setSelMonth(d.getMonth());
      setSelDay(d.getDate());
    }
  }, [visible]);

  const years = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => CURRENT_YEAR - YEAR_RANGE + i);

  function goNextStep(from: Step) {
    if (from === 'year') {
      const cap = daysInMonth(selYear, selMonth);
      if (selDay > cap) setSelDay(cap);
      setStep('month');
    } else if (from === 'month') {
      const cap = daysInMonth(selYear, selMonth);
      if (selDay > cap) setSelDay(cap);
      setStep('day');
    }
  }

  function handleConfirm() {
    const cap = daysInMonth(selYear, selMonth);
    const d = Math.min(selDay, cap);
    onConfirm(new Date(selYear, selMonth, d));
  }

  const totalDays   = daysInMonth(selYear, selMonth);
  const firstOffset = firstWeekdayOfMonth(selYear, selMonth);
  const cells: (number | null)[] = Array.from({ length: firstOffset + totalDays }, (_, i) => {
    if (i < firstOffset) return null;
    return i - firstOffset + 1;
  });
  while (cells.length % 7 !== 0) cells.push(null);

  const s = makeStyles(theme, SCREEN_H);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={8}
      >
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
              <Ionicons name="close" size={20} color={theme.subtext} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{title ?? 'Оберіть дату'}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Step indicators */}
          <View style={s.stepsRow}>
            {(['year', 'month', 'day'] as Step[]).map((st, i) => {
              const active = step === st;
              const done   = (step === 'month' && st === 'year') ||
                             (step === 'day'   && (st === 'year' || st === 'month'));
              const label  = st === 'year'  ? String(selYear)
                           : st === 'month' ? t.monthsShort[selMonth]
                           : String(selDay).padStart(2, '0');
              return (
                <React.Fragment key={st}>
                  {i > 0 && <View style={[s.stepSep, (done || active) ? { backgroundColor: theme.accent } : {}]} />}
                  <TouchableOpacity
                    style={[s.stepBubble, (active || done) && { backgroundColor: theme.accent }]}
                    onPress={() => { if (done) setStep(st); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.stepLabel, (active || done) && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>

          {/* ── YEAR STEP ── */}
          {step === 'year' && (
            <View style={s.stepContent}>
              <ScrollView style={s.listScroll} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[s.listItem, y === selYear && { backgroundColor: theme.accent + '22' }]}
                    onPress={() => { setSelYear(y); goNextStep('year'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.listItemText, y === selYear && { color: theme.accent, fontWeight: '700' }]}>
                      {y}
                    </Text>
                    {y === selYear && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── MONTH STEP ── */}
          {step === 'month' && (
            <View style={s.stepContent}>
              <ScrollView style={s.listScroll} showsVerticalScrollIndicator={false}>
                {t.months.map((name, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[s.listItem, idx === selMonth && { backgroundColor: theme.accent + '22' }]}
                    onPress={() => { setSelMonth(idx); goNextStep('month'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.listItemText, idx === selMonth && { color: theme.accent, fontWeight: '700' }]}>
                      {name}
                    </Text>
                    {idx === selMonth && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── DAY STEP (calendar grid) ── */}
          {step === 'day' && (
            <View style={s.stepContent}>
              <View style={s.calHeader}>
                {t.weekdays.map((wd) => (
                  <Text key={wd} style={s.calWd}>{wd}</Text>
                ))}
              </View>
              <View style={s.calGrid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={`e-${i}`} style={s.calCell} />;
                  const isSel = day === selDay;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[s.calCell, isSel && { backgroundColor: theme.accent, borderRadius: 20 }]}
                      onPress={() => setSelDay(day)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.calDay, isSel && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Save button */}
          <View style={s.footer}>
            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: theme.accent }]} onPress={handleConfirm} activeOpacity={0.75}>
              <Text style={s.confirmBtnText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: AppTheme, screenH: number) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.overlay,
    },
    sheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: screenH * 0.70,
      minHeight: screenH * 0.50,
      overflow: 'hidden',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    closeBtn: { padding: 4 },
    headerTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },

    stepsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 0,
    },
    stepBubble: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    stepLabel: { color: theme.subtext, fontSize: 14, fontWeight: '600' },
    stepSep: {
      width: 20,
      height: 1,
      backgroundColor: theme.border,
    },

    stepContent: { paddingHorizontal: 16, flex: 1 },

    listScroll: { maxHeight: screenH * 0.36 },
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginBottom: 2,
    },
    listItemText: { color: theme.text, fontSize: 15 },

    calHeader: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    calWd: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: theme.subtext,
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calCell: {
      width: `${100 / 7}%` as any,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calDay: {
      color: theme.text,
      fontSize: 14,
    },

    footer: {
      padding: 16,
      paddingBottom: 24,
    },
    confirmBtn: {
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    confirmBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
