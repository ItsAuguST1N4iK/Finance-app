import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Platform, useWindowDimensions, Keyboard, Animated,
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
  minDate?: Date;
  maxDate?: Date;
  /** Other end of a custom range — shown in the progress header */
  rangeFrom?: Date | null;
  rangeTo?: Date | null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function isDayInRange(year: number, month: number, day: number, minDate?: Date, maxDate?: Date): boolean {
  const d = new Date(year, month, day);
  if (minDate && d < startOfDay(minDate)) return false;
  if (maxDate && d > endOfDay(maxDate)) return false;
  return true;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Step = 'year' | 'month' | 'day';

const CURRENT_YEAR = new Date().getFullYear();
const ALL_YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);

function filterYears(minDate?: Date, maxDate?: Date): number[] {
  const minY = minDate ? minDate.getFullYear() : 1900;
  const maxY = maxDate ? maxDate.getFullYear() : CURRENT_YEAR;
  return ALL_YEARS.filter((y) => y >= minY && y <= maxY);
}

function filterMonths(year: number, minDate?: Date, maxDate?: Date): number[] {
  const out: number[] = [];
  for (let m = 0; m < 12; m++) {
    const total = daysInMonth(year, m);
    for (let d = 1; d <= total; d++) {
      if (isDayInRange(year, m, d, minDate, maxDate)) {
        out.push(m);
        break;
      }
    }
  }
  return out;
}

export function DatePickerModal({
  visible, value, onClose, onConfirm, title, minDate, maxDate, rangeFrom, rangeTo,
}: Props) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const { height: SCREEN_H } = useWindowDimensions();
  const surface = cardSurface();

  const now = value ?? new Date();
  const [step, setStep] = useState<Step>('year');
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState<number | null>(value ? now.getMonth() : null);
  const [selDay, setSelDay] = useState(now.getDate());
  const [previewYear, setPreviewYear] = useState<number | null>(value ? now.getFullYear() : null);
  const [previewMonth, setPreviewMonth] = useState<number | null>(value ? now.getMonth() : null);
  const [inputMode, setInputMode] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [mounted, setMounted] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const yearScrollRef = useRef<ScrollView>(null);

  const availableYears = useMemo(() => filterYears(minDate, maxDate), [minDate, maxDate]);
  const availableMonths = useMemo(
    () => (previewYear != null ? filterMonths(previewYear, minDate, maxDate) : []),
    [previewYear, minDate, maxDate],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const d = value ?? new Date();
      setStep('year');
      setSelYear(d.getFullYear());
      setSelMonth(value ? d.getMonth() : null);
      setSelDay(d.getDate());
      setPreviewYear(value ? d.getFullYear() : null);
      setPreviewMonth(value ? d.getMonth() : null);
      setInputMode(false);
      setInputVal('');
      setKeyboardInset(0);
      sheetTranslateY.setValue(SCREEN_H);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, (e) => setKeyboardInset(e.endCoordinates.height));
    const subHide = Keyboard.addListener(hideEvt, () => setKeyboardInset(0));
    return () => { subShow.remove(); subHide.remove(); };
  }, [visible]);

  useEffect(() => {
    if (step === 'year' && !inputMode && previewYear != null && yearScrollRef.current) {
      const idx = availableYears.findIndex((y) => y === previewYear);
      if (idx >= 0) {
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ y: idx * 54, animated: false });
        }, 80);
      }
    }
  }, [step, inputMode, visible, previewYear, availableYears]);

  function confirmYearStep() {
    if (previewYear == null) return;
    setSelYear(previewYear);
    setSelMonth(null);
    setPreviewMonth(null);
    setStep('month');
    setInputMode(false);
    setInputVal('');
  }

  function confirmMonthStep() {
    if (previewMonth == null) return;
    setSelMonth(previewMonth);
    const cap = daysInMonth(selYear, previewMonth);
    let day = selDay;
    if (!isDayInRange(selYear, previewMonth, day, minDate, maxDate)) {
      for (let d = 1; d <= cap; d++) {
        if (isDayInRange(selYear, previewMonth, d, minDate, maxDate)) { day = d; break; }
      }
    }
    setSelDay(Math.min(day, cap));
    setStep('day');
    setInputMode(false);
    setInputVal('');
  }

  function handleStepConfirm() {
    if (step === 'year') confirmYearStep();
    else if (step === 'month') confirmMonthStep();
    else handleConfirm();
  }

  const stepConfirmLabel = step === 'year'  ? t.dateConfirmYear
    : step === 'month' ? t.dateConfirmMonth
    : t.dateConfirmDay;

  const canConfirmStep = step === 'year'
    ? previewYear != null
    : step === 'month'
      ? previewMonth != null
      : selMonth != null;

  function handleConfirm() {
    if (selMonth == null) return;
    Keyboard.dismiss();
    const cap = daysInMonth(selYear, selMonth);
    const d = Math.min(selDay, cap);
    const result = startOfDay(new Date(selYear, selMonth, d));
    if (minDate && result < startOfDay(minDate)) return;
    if (maxDate && result > endOfDay(maxDate)) return;
    onConfirm(result);
  }

  function handleKeyboardSubmit() {
    const val = inputVal.trim();
    if (step === 'year') {
      const y = parseInt(val, 10);
      if (!isNaN(y) && availableYears.includes(y)) {
        setPreviewYear(y);
        setInputMode(false);
        setInputVal('');
      }
    } else if (step === 'month') {
      let m = parseInt(val, 10);
      if (!isNaN(m) && m >= 1 && m <= 12 && previewYear != null && availableMonths.includes(m - 1)) {
        setPreviewMonth(m - 1);
        setInputMode(false);
        setInputVal('');
      }
    } else if (step === 'day') {
      if (selMonth == null) return;
      const d = parseInt(val, 10);
      const cap = daysInMonth(selYear, selMonth);
      if (!isNaN(d) && d >= 1 && d <= cap && isDayInRange(selYear, selMonth, d, minDate, maxDate)) {
        setSelDay(d);
        setInputMode(false);
        setInputVal('');
      }
    }
  }

  const activeMonth = selMonth ?? previewMonth;
  const totalDays   = activeMonth != null ? daysInMonth(selYear, activeMonth) : 31;
  const firstOffset = activeMonth != null ? firstWeekdayOfMonth(selYear, activeMonth) : 0;
  const cells: (number | null)[] = activeMonth != null
    ? Array.from({ length: firstOffset + totalDays }, (_, i) => {
        if (i < firstOffset) return null;
        return i - firstOffset + 1;
      })
    : [];
  while (cells.length % 7 !== 0) cells.push(null);

  const s = makeStyles(theme, SCREEN_H, surface);

  const inputPlaceholder = step === 'year' ? String(CURRENT_YEAR)
    : step === 'month' ? '1–12'
    : `1–${activeMonth != null ? daysInMonth(selYear, activeMonth) : 31}`;

  const stepLabels: Record<Step, string> = {
    year: previewYear != null ? String(previewYear) : '—',
    month: previewMonth != null ? t.months[previewMonth] : '—',
    day: selMonth != null ? String(selDay) : '—',
  };

  const stepProgress = step === 'year' ? 0.33 : step === 'month' ? 0.66 : 1;

  const fromLabel = rangeFrom ? fmtDate(rangeFrom) : '—';
  const toLabel   = rangeTo   ? fmtDate(rangeTo)   : '—';
  const showRangeHeader = rangeFrom != null || rangeTo != null;

  if (!visible && !mounted) return null;

  return (
    <Modal visible={visible || mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[
          s.sheet,
          { transform: [{ translateY: sheetTranslateY }] },
          keyboardInset > 0 && {
            paddingBottom: Math.max(0, keyboardInset - (Platform.OS === 'android' ? 24 : 8)),
          },
        ]}>
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
              <Ionicons name="close" size={20} color={theme.subtext} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{title ?? t.datePickerDefaultTitle}</Text>
            <TouchableOpacity
              style={s.keyboardToggleBtn}
              onPress={() => { setInputMode((v) => !v); setInputVal(''); }}
              activeOpacity={0.75}
            >
              <Ionicons name={inputMode ? 'list-outline' : 'create-outline'} size={18} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {showRangeHeader && (
            <View style={s.rangeHeader}>
              <Text style={[s.rangeLabel, { color: theme.subtext }]}>
                {t.dateRangeFrom} <Text style={{ color: theme.accent, fontWeight: '700' }}>{fromLabel}</Text>
                {'  →  '}
                {t.dateRangeTo} <Text style={{ color: theme.accent, fontWeight: '700' }}>{toLabel}</Text>
              </Text>
              <View style={[s.progressTrack, { backgroundColor: theme.border }]}>
                <View style={[s.progressFill, { backgroundColor: theme.accent, width: `${stepProgress * 100}%` }]} />
              </View>
            </View>
          )}

          <View style={s.stepsRow}>
            {(['year', 'month', 'day'] as Step[]).map((st) => {
              const active = step === st;
              const done   = (step === 'month' && st === 'year') ||
                             (step === 'day'   && (st === 'year' || st === 'month'));
              const canJump = done || active;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.stepChip, (active || done) && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
                  onPress={() => { if (done) { setStep(st); setInputMode(false); setInputVal(''); } }}
                  disabled={!canJump}
                  activeOpacity={0.75}
                >
                  <Text style={[s.stepChipLabel, { color: theme.subtext }]}>
                    {st === 'year' ? t.dateStepYear : st === 'month' ? t.dateStepMonth : t.dateStepDay}
                  </Text>
                  <Text style={[s.stepChipValue, (active || done) && { color: theme.accent }]} numberOfLines={1}>
                    {stepLabels[st]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {inputMode && (
            <View style={s.keyboardInputWrap}>
              <TextInput
                style={[s.keyboardInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.accent }]}
                keyboardType="number-pad"
                placeholder={inputPlaceholder}
                placeholderTextColor={theme.subtext}
                value={inputVal}
                onChangeText={setInputVal}
                autoFocus
                maxLength={4}
                onSubmitEditing={handleKeyboardSubmit}
              />
              <TouchableOpacity
                style={[s.keyboardSubmitBtn, { backgroundColor: theme.accent }]}
                onPress={handleKeyboardSubmit}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={[s.bodyArea, { minHeight: SCREEN_H * 0.28 }]}>
            {inputMode && step !== 'day' ? (
              <View style={{ minHeight: SCREEN_H * 0.28 }} />
            ) : null}

            {step === 'year' && !inputMode && (
              <ScrollView
                ref={yearScrollRef}
                style={s.listScroll}
                contentContainerStyle={s.yearScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {availableYears.map((y) => {
                  const selected = y === previewYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[s.yearChip, { borderColor: theme.border, backgroundColor: theme.cardAlt },
                        selected && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
                      onPress={() => setPreviewYear(y)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.yearChipText, selected && { color: theme.accent, fontWeight: '700' }]}>
                        {y}
                      </Text>
                      {selected && <Ionicons name="checkmark-circle" size={18} color={theme.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {step === 'month' && !inputMode && (
              <View style={s.monthGrid}>
                {t.months.map((name, monthIdx) => {
                  if (!availableMonths.includes(monthIdx)) return null;
                  const selected = monthIdx === previewMonth;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[s.monthChip, { borderColor: theme.border, backgroundColor: theme.cardAlt },
                        selected && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
                      onPress={() => setPreviewMonth(monthIdx)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.monthChipNum, { color: selected ? theme.accent : theme.subtext }]}>
                        {monthIdx + 1}
                      </Text>
                      <Text style={[s.monthChipName, selected && { color: theme.accent, fontWeight: '700' }]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {step === 'day' && !inputMode && activeMonth != null && (
              <View style={s.dayContent}>
                <View style={s.calHeader}>
                  {t.weekdays.map((wd) => (
                    <Text key={wd} style={s.calWd}>{wd}</Text>
                  ))}
                </View>
                <View style={s.calGrid}>
                  {cells.map((day, i) => {
                    if (day === null) return <View key={`e-${i}`} style={s.calCell} />;
                    const disabled = !isDayInRange(selYear, activeMonth, day, minDate, maxDate);
                    const isSel = !disabled && day === selDay;
                    return (
                      <TouchableOpacity
                        key={`d-${i}-${day}`}
                        style={s.calCell}
                        onPress={() => !disabled && setSelDay(day)}
                        activeOpacity={0.75}
                        disabled={disabled}
                      >
                        <View style={[
                          s.calDayCircle,
                          disabled
                            ? { borderColor: 'transparent', backgroundColor: 'transparent' }
                            : isSel
                              ? { backgroundColor: theme.accent, borderColor: theme.accent }
                              : { borderColor: theme.border, borderWidth: 1 },
                        ]}>
                          <Text style={[
                            s.calDay,
                            disabled && { color: theme.border },
                            isSel && { color: '#fff', fontWeight: '700' },
                          ]}>
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: theme.accent, opacity: canConfirmStep ? 1 : 0.45 }]}
              onPress={handleStepConfirm}
              disabled={!canConfirmStep}
              activeOpacity={0.75}
            >
              <Text style={s.confirmBtnText}>{stepConfirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(
  theme: AppTheme,
  screenH: number,
  surface: { backgroundColor: string; borderColor: string; borderWidth: number },
) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay,
    },
    sheet: {
      backgroundColor: surface.backgroundColor,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: screenH * 0.72,
      overflow: 'hidden',
      borderTopWidth: Math.max(1, surface.borderWidth),
      borderTopColor: surface.borderColor !== 'transparent' ? surface.borderColor : theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    closeBtn: { padding: 4, width: 28 },
    keyboardToggleBtn: { padding: 4, width: 28, alignItems: 'flex-end' },
    headerTitle: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

    rangeHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 8,
    },
    rangeLabel: { fontSize: 12, textAlign: 'center' },
    progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },

    stepsRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    stepChip: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepChipLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    stepChipValue: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },

    keyboardInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    keyboardInput: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.5,
      padding: 12,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    keyboardSubmitBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    bodyArea: { flex: 1, overflow: 'hidden' },
    dayContent: { paddingHorizontal: 16, flex: 1 },

    listScroll: { flex: 1 },
    yearScrollContent: { paddingHorizontal: 16, paddingVertical: 8 },
    yearChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 6,
    },
    yearChipText: { color: theme.text, fontSize: 16, textAlign: 'center' },

    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      justifyContent: 'center',
    },
    monthChip: {
      width: '30%',
      minWidth: 96,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    monthChipNum: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
    monthChipName: { color: theme.text, fontSize: 13, textAlign: 'center' },

    calHeader: { flexDirection: 'row', marginBottom: 8, marginTop: 8 },
    calWd: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: theme.subtext },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center' },
    calDayCircle: {
      width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    },
    calDay: {
      color: theme.text,
      fontSize: 13,
      textAlign: 'center',
      width: 34,
      lineHeight: 16,
      ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : {}),
    },

    footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
    confirmBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
