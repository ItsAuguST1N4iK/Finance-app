import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Platform, useWindowDimensions, Keyboard, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { WiggleActionIcon } from './MotionIcons';
import { BottomSheetModal } from './BottomSheetModal';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { AppTheme } from '../theme';
import { sheetMaxPx } from '../theme/sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { commonStyles } from '../theme/commonStyles';
import { layout, radius, space, stroke, type } from '../theme/tokens';

interface Props {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
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
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listMaxH = Math.min(340, Math.round(sheetMaxPx(winH, {
    topInset: Math.max(insets.top, 8),
    bottomInset: insets.bottom,
  }) * 0.52));

  const now = value ?? new Date();
  const [step, setStep] = useState<Step>('year');
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState<number | null>(value ? now.getMonth() : null);
  const [selDay, setSelDay] = useState(now.getDate());
  const [previewYear, setPreviewYear] = useState<number | null>(value ? now.getFullYear() : null);
  const [previewMonth, setPreviewMonth] = useState<number | null>(value ? now.getMonth() : null);
  const [inputMode, setInputMode] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const availableYears = useMemo(() => filterYears(minDate, maxDate), [minDate, maxDate]);
  const availableMonths = useMemo(
    () => (previewYear != null ? filterMonths(previewYear, minDate, maxDate) : []),
    [previewYear, minDate, maxDate],
  );

  useEffect(() => {
    if (!visible) return;
    const d = value ?? new Date();
    setStep('year');
    setSelYear(d.getFullYear());
    setSelMonth(value ? d.getMonth() : null);
    setSelDay(d.getDate());
    setPreviewYear(value ? d.getFullYear() : null);
    setPreviewMonth(value ? d.getMonth() : null);
    setInputMode(false);
    setInputVal('');
  }, [visible, value]);

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

  function handleStepConfirm() {
    if (step === 'year') confirmYearStep();
    else if (step === 'month') confirmMonthStep();
    else handleConfirm();
  }

  const stepConfirmLabel = step === 'year' ? t.dateConfirmYear
    : step === 'month' ? t.dateConfirmMonth
    : t.dateConfirmDay;

  const canConfirmStep = step === 'year'
    ? previewYear != null
    : step === 'month'
      ? previewMonth != null
      : selMonth != null;

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
      const m = parseInt(val, 10);
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
  const totalDays = activeMonth != null ? daysInMonth(selYear, activeMonth) : 31;
  const firstOffset = activeMonth != null ? firstWeekdayOfMonth(selYear, activeMonth) : 0;
  const cells: (number | null)[] = activeMonth != null
    ? Array.from({ length: firstOffset + totalDays }, (_, i) => {
        if (i < firstOffset) return null;
        return i - firstOffset + 1;
      })
    : [];
  while (cells.length % 7 !== 0) cells.push(null);

  const s = makeStyles(theme);

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
  const toLabel = rangeTo ? fmtDate(rangeTo) : '—';
  const showRangeHeader = rangeFrom != null || rangeTo != null;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      bodyScroll={false}
      footer={(
        <PressableScale
          style={[
            commonStyles.footerBtnPrimarySolo,
            { backgroundColor: theme.accent, opacity: canConfirmStep ? 1 : 0.45 },
          ]}
          onPress={handleStepConfirm}
          disabled={!canConfirmStep}
          scaleTo={0.98}
        >
          <Text style={[commonStyles.footerBtnTextPrimary, { color: theme.onAccent }]}>
            {stepConfirmLabel || t.txApply}
          </Text>
        </PressableScale>
      )}
    >
      <View style={s.header}>
        <View style={s.closeBtn} />
        <Text style={s.headerTitle}>{title ?? t.datePickerDefaultTitle}</Text>
        {inputMode ? (
          <PressableScale
            style={s.keyboardToggleBtn}
            onPress={() => { setInputMode(false); setInputVal(''); }}
            feedback="opacity"
          >
            <Ionicons name="list-outline" size={18} color={theme.accent} />
          </PressableScale>
        ) : (
          <WiggleActionIcon
            name="create-outline"
            size={18}
            color={theme.accent}
            onPress={() => { setInputMode(true); setInputVal(''); }}
            style={s.keyboardToggleBtn}
          />
        )}
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
          const done = (step === 'month' && st === 'year')
            || (step === 'day' && (st === 'year' || st === 'month'));
          const canJump =
            active
            || done
            || (st === 'year')
            || (st === 'month' && previewYear != null)
            || (st === 'day' && previewYear != null && (previewMonth != null || selMonth != null));
          return (
            <PressableScale
              key={st}
              style={[
                s.stepChip,
                { borderColor: theme.border, backgroundColor: theme.cardAlt },
                done && !active && { borderColor: theme.accent + '66', backgroundColor: theme.accent + '12' },
                active && { borderColor: theme.accent, backgroundColor: theme.accent + '22', borderWidth: stroke.width + 0.5 },
              ]}
              onPress={() => {
                if (!canJump || active) return;
                if (st === 'month' && previewYear != null) setSelYear(previewYear);
                if (st === 'day') {
                  if (previewYear != null) setSelYear(previewYear);
                  if (previewMonth != null) setSelMonth(previewMonth);
                }
                setStep(st);
                setInputMode(false);
                setInputVal('');
              }}
              disabled={!canJump}
              scaleTo={0.97}
            >
              <Text style={[
                s.stepChipLabel,
                { color: active ? theme.accent : theme.subtext },
              ]}>
                {st === 'year' ? t.dateStepYear : st === 'month' ? t.dateStepMonth : t.dateStepDay}
              </Text>
              <Text
                style={[
                  s.stepChipValue,
                  { color: active ? theme.accent : done ? theme.text : theme.subtext },
                  active && { fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {stepLabels[st]}
              </Text>
            </PressableScale>
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
          <PressableScale
            style={[s.keyboardSubmitBtn, { backgroundColor: theme.accent }]}
            onPress={handleKeyboardSubmit}
          >
            <Ionicons name="checkmark" size={20} color={theme.onAccent} />
          </PressableScale>
        </View>
      )}

      <View style={[s.bodyArea, { height: listMaxH }]}>
        {step === 'year' && !inputMode && (
          <FlatList
            data={availableYears}
            keyExtractor={(y) => String(y)}
            style={{ height: listMaxH }}
            contentContainerStyle={s.yearScrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            scrollIndicatorInsets={{ right: 2 }}
            initialNumToRender={14}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemLayout={(_, index) => ({ length: 54, offset: 54 * index, index })}
            renderItem={({ item: y }) => {
              const selected = y === previewYear;
              return (
                <PressableScale
                  feedback="none"
                  style={[s.yearChip, { borderColor: theme.border, backgroundColor: theme.cardAlt },
                    selected && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
                  onPress={() => setPreviewYear(y)}
                >
                  <Text style={[s.yearChipText, selected && { color: theme.accent, fontWeight: '700' }]}>
                    {y}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={theme.accent} />}
                </PressableScale>
              );
            }}
          />
        )}

        {step === 'month' && !inputMode && (
          <View style={s.monthGrid}>
            {t.months.map((name, monthIdx) => {
              if (!availableMonths.includes(monthIdx)) return null;
              const selected = monthIdx === previewMonth;
              return (
                <View key={name} style={s.monthCell}>
                  <PressableScale
                    feedback="none"
                    style={[
                      s.monthChip,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.cardAlt,
                      },
                      selected && { backgroundColor: theme.accent + '22', borderColor: theme.accent },
                    ]}
                    onPress={() => setPreviewMonth(monthIdx)}
                  >
                    <Text style={[s.monthChipNum, { color: selected ? theme.accent : theme.subtext }]}>
                      {monthIdx + 1}
                    </Text>
                    <Text
                      style={[s.monthChipName, selected && { color: theme.accent, fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </PressableScale>
                </View>
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
                  <PressableScale
                    key={`d-${i}-${day}`}
                    feedback="none"
                    style={s.calCell}
                    onPress={() => !disabled && setSelDay(day)}
                    disabled={disabled}
                  >
                    <View style={[
                      s.calDayCircle,
                      disabled
                        ? { borderColor: 'transparent', backgroundColor: 'transparent' }
                        : isSel
                          ? { backgroundColor: theme.accent, borderColor: theme.accent }
                          : { borderColor: theme.border, borderWidth: stroke.width },
                    ]}>
                      <Text style={[
                        s.calDay,
                        disabled && { color: theme.border },
                        isSel && { color: theme.onAccent, fontWeight: '700' },
                      ]}>
                        {day}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space[3],
    },
    closeBtn: { padding: space[1], width: 28 },
    keyboardToggleBtn: { padding: space[1], width: 28, alignItems: 'flex-end' },
    headerTitle: { color: theme.text, ...type.title, flex: 1, textAlign: 'center' },

    rangeHeader: {
      marginBottom: space[3],
      gap: space[2],
    },
    rangeLabel: { ...type.meta, textAlign: 'center' },
    progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },

    stepsRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space[2],
      marginBottom: space[3],
    },
    stepChip: {
      flex: 1,
      borderRadius: radius.md,
      borderWidth: stroke.width,
      paddingVertical: space[2.5],
      paddingHorizontal: space[1],
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepChipLabel: {
      ...type.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    stepChipValue: {
      ...type.meta,
      fontWeight: '700',
      textAlign: 'center',
    },

    keyboardInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2.5],
      marginBottom: space[3],
    },
    keyboardInput: {
      flex: 1,
      borderRadius: radius.md,
      borderWidth: stroke.width,
      padding: space[3],
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    keyboardSubmitBtn: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    bodyArea: { overflow: 'hidden' },
    dayContent: { flexGrow: 0 },

    yearScrollContent: {
      paddingVertical: space[1],
      paddingRight: layout.scrollGutter,
    },
    yearChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      paddingVertical: space[3] + 2,
      paddingHorizontal: layout.sheetPad,
      borderRadius: radius.md,
      borderWidth: stroke.width,
      marginBottom: space[1] + 2,
    },
    yearChipText: { color: theme.text, ...type.body, textAlign: 'center' },

    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%',
      marginHorizontal: -4,
    },
    /** 3 columns × 4 rows — padding instead of gap (gap breaks % widths on RN). */
    monthCell: {
      width: '33.333%',
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    monthChip: {
      width: '100%',
      borderRadius: radius.md,
      borderWidth: stroke.width,
      paddingVertical: space[2],
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthChipNum: { ...type.caption, fontWeight: '700', marginBottom: 2 },
    monthChipName: { color: theme.text, fontSize: 11, textAlign: 'center' },

    calHeader: { flexDirection: 'row', marginBottom: space[2], marginTop: space[1] },
    calWd: { flex: 1, textAlign: 'center', ...type.caption, color: theme.subtext },
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
  });
}
