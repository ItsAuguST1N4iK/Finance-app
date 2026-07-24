import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Platform, useWindowDimensions, Keyboard,
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
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

type Step = 'year' | 'month' | 'day';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTH_ITEM_H = 54;
const LOOP_COPIES = 5;
const LOOP_MID = Math.floor(LOOP_COPIES / 2);

export function DatePickerModal({ visible, value, onClose, onConfirm, title, minDate, maxDate }: Props) {
  const { theme, cardSurface } = useTheme();
  const { t }     = useLanguage();
  const { height: SCREEN_H } = useWindowDimensions();

  const now = value ?? new Date();
  const [step,      setStep]      = useState<Step>('year');
  const [selYear,   setSelYear]   = useState(now.getFullYear());
  const [selMonth,  setSelMonth]  = useState(now.getMonth());
  const [selDay,    setSelDay]    = useState(now.getDate());
  const [previewYear,  setPreviewYear]  = useState(now.getFullYear());
  const [previewMonth, setPreviewMonth] = useState(now.getMonth());
  const [inputMode, setInputMode] = useState(false);
  const [inputVal,  setInputVal]  = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);

  const yearScrollRef  = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const loopedYears  = useMemo(() => Array.from({ length: LOOP_COPIES }, () => YEARS).flat(), []);
  const loopedMonths = useMemo(() => Array.from({ length: LOOP_COPIES }, () => t.months).flat(), [t.months]);

  useEffect(() => {
    if (visible) {
      const d = value ?? new Date();
      setStep('year');
      setSelYear(d.getFullYear());
      setSelMonth(d.getMonth());
      setSelDay(d.getDate());
      setPreviewYear(d.getFullYear());
      setPreviewMonth(d.getMonth());
      setInputMode(false);
      setInputVal('');
      setKeyboardInset(0);
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
    if (step === 'year' && !inputMode && yearScrollRef.current) {
      const idx = YEARS.findIndex((y) => y === selYear);
      if (idx >= 0) {
        const y = (LOOP_MID * YEARS.length + idx) * MONTH_ITEM_H;
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ y, animated: false });
        }, 50);
      }
    }
    if (step === 'month' && !inputMode && monthScrollRef.current) {
      const y = (LOOP_MID * 12 + selMonth) * MONTH_ITEM_H;
      setTimeout(() => {
        monthScrollRef.current?.scrollTo({ y, animated: false });
      }, 50);
    }
  }, [step, inputMode, visible, selMonth, selYear]);

  function recenterYearScroll(y: number) {
    const idx = Math.round(y / MONTH_ITEM_H);
    const yearIdx = ((idx % YEARS.length) + YEARS.length) % YEARS.length;
    setPreviewYear(YEARS[yearIdx]);
    const midY = (LOOP_MID * YEARS.length + yearIdx) * MONTH_ITEM_H;
    if (Math.abs(y - midY) > YEARS.length * MONTH_ITEM_H) {
      yearScrollRef.current?.scrollTo({ y: midY, animated: false });
    }
  }

  function recenterMonthScroll(y: number) {
    const idx = Math.round(y / MONTH_ITEM_H);
    const monthIdx = ((idx % 12) + 12) % 12;
    setPreviewMonth(monthIdx);
    const midY = (LOOP_MID * 12 + monthIdx) * MONTH_ITEM_H;
    if (Math.abs(y - midY) > 12 * MONTH_ITEM_H) {
      monthScrollRef.current?.scrollTo({ y: midY, animated: false });
    }
  }

  function confirmYearStep() {
    setSelYear(previewYear);
    const cap = daysInMonth(previewYear, selMonth);
    if (selDay > cap) setSelDay(cap);
    setPreviewMonth(selMonth);
    setStep('month');
    setInputMode(false);
    setInputVal('');
  }

  function confirmMonthStep() {
    setSelMonth(previewMonth);
    const cap = daysInMonth(selYear, previewMonth);
    if (selDay > cap) setSelDay(cap);
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

  function handleConfirm() {
    Keyboard.dismiss();
    const cap = daysInMonth(selYear, selMonth);
    const d = Math.min(selDay, cap);
    const result = new Date(selYear, selMonth, d);
    if (minDate && result < minDate) return;
    if (maxDate && result > maxDate) return;
    onConfirm(result);
  }

  function handleKeyboardSubmit() {
    const val = inputVal.trim();
    if (step === 'year') {
      const y = parseInt(val, 10);
      if (!isNaN(y) && y >= 1900 && y <= CURRENT_YEAR) {
        setPreviewYear(y);
        setInputMode(false);
        setInputVal('');
      }
    } else if (step === 'month') {
      let m = parseInt(val, 10);
      if (!isNaN(m)) {
        m = ((m - 1) % 12 + 12) % 12;
        setPreviewMonth(m);
        setInputMode(false);
        setInputVal('');
      }
    } else if (step === 'day') {
      const d = parseInt(val, 10);
      const cap = daysInMonth(selYear, selMonth);
      if (!isNaN(d) && d >= 1 && d <= cap) {
        setSelDay(d);
        setInputMode(false);
        setInputVal('');
      }
    }
  }

  const totalDays   = daysInMonth(selYear, selMonth);
  const firstOffset = firstWeekdayOfMonth(selYear, selMonth);
  const cells: (number | null)[] = Array.from({ length: firstOffset + totalDays }, (_, i) => {
    if (i < firstOffset) return null;
    return i - firstOffset + 1;
  });
  while (cells.length % 7 !== 0) cells.push(null);

  const s = makeStyles(theme, SCREEN_H, cardSurface());

  const contentMinH = SCREEN_H * 0.30;

  const inputPlaceholder = step === 'year' ? String(CURRENT_YEAR)
    : step === 'month' ? '1–12'
    : `1–${daysInMonth(selYear, selMonth)}`;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[
          s.sheet,
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
              onPress={() => {
                setInputMode((v) => !v);
                setInputVal('');
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={inputMode ? 'list-outline' : 'create-outline'}
                size={18}
                color={theme.accent}
              />
            </TouchableOpacity>
          </View>

          <View style={s.stepsRow}>
            {(['year', 'month', 'day'] as Step[]).map((st, i) => {
              const active = step === st;
              const done   = (step === 'month' && st === 'year') ||
                             (step === 'day'   && (st === 'year' || st === 'month'));
              const label  = st === 'year'  ? String(selYear)
                           : st === 'month' ? String(selMonth + 1)
                           : String(selDay);
              return (
                <React.Fragment key={st}>
                  {i > 0 && <View style={[s.stepSep, (done || active) ? { backgroundColor: theme.accent } : {}]} />}
                  <TouchableOpacity
                    style={[s.stepBubble, (active || done) && { backgroundColor: theme.accent }]}
                    onPress={() => { if (done) { setStep(st); setInputMode(false); setInputVal(''); } }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.stepLabel, (active || done) && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                </React.Fragment>
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

          <View style={[s.bodyArea, { minHeight: contentMinH }]}>
            {inputMode && step !== 'day' ? (
              <View style={{ minHeight: contentMinH }} />
            ) : null}

            {step === 'year' && !inputMode && (
              <ScrollView
                ref={yearScrollRef}
                style={s.listScroll}
                contentContainerStyle={s.listScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={MONTH_ITEM_H}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => recenterYearScroll(e.nativeEvent.contentOffset.y)}
                onScrollEndDrag={(e) => recenterYearScroll(e.nativeEvent.contentOffset.y)}
              >
                {loopedYears.map((y, i) => (
                  <TouchableOpacity
                    key={`y-${i}-${y}`}
                    style={[s.listItem, y === previewYear && { backgroundColor: theme.accent + '22' }]}
                    onPress={() => setPreviewYear(y)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.listItemText, y === previewYear && { color: theme.accent, fontWeight: '700' }]}>
                      {y}
                    </Text>
                    {y === previewYear && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'month' && !inputMode && (
              <ScrollView
                ref={monthScrollRef}
                style={s.listScroll}
                contentContainerStyle={s.listScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={MONTH_ITEM_H}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => recenterMonthScroll(e.nativeEvent.contentOffset.y)}
                onScrollEndDrag={(e) => recenterMonthScroll(e.nativeEvent.contentOffset.y)}
              >
                {loopedMonths.map((name, i) => {
                  const monthIdx = i % 12;
                  const selected = monthIdx === previewMonth;
                  return (
                    <TouchableOpacity
                      key={`m-${i}-${name}`}
                      style={[s.listItem, selected && { backgroundColor: theme.accent + '22' }]}
                      onPress={() => setPreviewMonth(monthIdx)}
                      activeOpacity={0.75}
                    >
                      <View style={s.listItemCenter}>
                        <View style={[s.monthNumBadge, { backgroundColor: selected ? theme.accent : theme.cardAlt }]}>
                          <Text style={[s.monthNum, { color: selected ? '#fff' : theme.subtext }]}>
                            {monthIdx + 1}
                          </Text>
                        </View>
                        <Text style={[s.listItemText, selected && { color: theme.accent, fontWeight: '700' }]}>
                          {name}
                        </Text>
                        {selected && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {step === 'day' && !inputMode && (
              <View style={s.dayContent}>
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
                        key={`d-${i}-${day}`}
                        style={s.calCell}
                        onPress={() => setSelDay(day)}
                        activeOpacity={0.75}
                      >
                        <View style={[
                          s.calDayCircle,
                          isSel
                            ? { backgroundColor: theme.accent, borderColor: theme.accent }
                            : { borderColor: theme.border, borderWidth: 1 },
                        ]}>
                          <Text style={[s.calDay, isSel && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={s.footer}>
            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: theme.accent }]} onPress={handleStepConfirm} activeOpacity={0.75}>
              <Text style={s.confirmBtnText}>{stepConfirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
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

    stepsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    stepBubble: {
      minWidth: 52,
      height: 34,
      paddingHorizontal: 14,
      borderRadius: 17,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepLabel: {
      color: theme.subtext,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 18,
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    },
    stepSep: {
      width: 20,
      height: 1,
      backgroundColor: theme.border,
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
    listScrollContent: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    listItem: {
      width: '100%',
      maxWidth: 320,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginBottom: 6,
      height: MONTH_ITEM_H,
    },
    listItemCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    listItemText: { color: theme.text, fontSize: 15, textAlign: 'center' },

    monthNumBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthNum: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 14,
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    },

    calHeader: {
      flexDirection: 'row',
      marginBottom: 8,
      marginTop: 8,
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
      width: '14.28%',
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calDayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calDay: {
      color: theme.text,
      fontSize: 13,
      textAlign: 'center',
      width: 34,
      lineHeight: 16,
      ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : {}),
    },

    footer: {
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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
