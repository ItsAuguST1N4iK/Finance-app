import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

const THUMB_SIZE = 22;
const THUMB_R = THUMB_SIZE / 2;
const TRACK_PAD = THUMB_R;
/** Ignore vertical scroll gestures; only claim horizontal drags. */
const MOVE_SLOP = 6;

function snap(value: number, min: number, max: number, step: number): number {
  const steps = Math.round((value - min) / step);
  const snapped = min + steps * step;
  return Math.max(min, Math.min(max, +snapped.toFixed(4)));
}

export function SettingSlider({ value, min, max, step, onChange, format }: Props) {
  const { theme } = useTheme();
  const [trackW, setTrackW] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackWRef = useRef(0);
  const grantX = useRef(0);
  const claimed = useRef(false);
  const thumbLeftAnim = useRef(new Animated.Value(0)).current;
  const propsRef = useRef({ min, max, step, onChange, value });
  propsRef.current = { min, max, step, onChange, value };

  const displayValue = dragValue ?? value;
  const label = format ? format(displayValue) : displayValue.toFixed(2);

  const innerSpan = Math.max(1, trackW - 2 * TRACK_PAD - THUMB_SIZE);
  const pct = (displayValue - min) / (max - min);
  const thumbLeft = TRACK_PAD + innerSpan * pct;
  const fillLeft = TRACK_PAD;
  const fillWidth = Math.max(THUMB_R, thumbLeft + THUMB_R - TRACK_PAD);

  const inactiveRail = theme.isDark ? '#141414' : '#d4d4d4';

  function thumbLeftForValue(v: number): number {
    const w = trackWRef.current;
    if (w <= 0) return TRACK_PAD;
    const { min: lo, max: hi } = propsRef.current;
    const span = Math.max(1, w - 2 * TRACK_PAD - THUMB_SIZE);
    const pctV = (v - lo) / (hi - lo);
    return TRACK_PAD + span * pctV;
  }

  useEffect(() => {
    if (!isDragging) {
      thumbLeftAnim.setValue(thumbLeftForValue(value));
    }
  }, [value, isDragging, thumbLeftAnim]);

  function rawFromX(x: number): number {
    const { min: lo, max: hi } = propsRef.current;
    const w = trackWRef.current;
    if (w <= 0) return propsRef.current.value;
    const span = Math.max(1, w - 2 * TRACK_PAD - THUMB_SIZE);
    const clamped = Math.max(TRACK_PAD, Math.min(w - TRACK_PAD - THUMB_SIZE, x - THUMB_R));
    return lo + ((clamped - TRACK_PAD) / span) * (hi - lo);
  }

  function commitFromX(x: number) {
    if (!claimed.current) {
      setDragValue(null);
      setIsDragging(false);
      return;
    }
    const { min: lo, max: hi, step: st, onChange: set } = propsRef.current;
    const snapped = snap(rawFromX(x), lo, hi, st);
    set(snapped);
    setDragValue(null);
    setIsDragging(false);
    claimed.current = false;
    Animated.spring(thumbLeftAnim, {
      toValue: thumbLeftForValue(snapped),
      useNativeDriver: false,
      friction: 9,
      tension: 120,
    }).start();
  }

  function cancelDrag() {
    setDragValue(null);
    setIsDragging(false);
    claimed.current = false;
    thumbLeftAnim.setValue(thumbLeftForValue(propsRef.current.value));
  }

  const pan = useRef(
    PanResponder.create({
      // Don't steal taps from ScrollView on touch-down
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Only claim when the gesture is clearly horizontal
      onMoveShouldSetPanResponder: (_, g) => {
        const absDx = Math.abs(g.dx);
        const absDy = Math.abs(g.dy);
        return absDx > MOVE_SLOP && absDx > absDy;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const absDx = Math.abs(g.dx);
        const absDy = Math.abs(g.dy);
        return absDx > MOVE_SLOP && absDx > absDy;
      },
      onPanResponderTerminationRequest: () => !claimed.current,
      onPanResponderGrant: (evt, gestureState) => {
        claimed.current = true;
        setIsDragging(true);
        // locationX is current finger; dx is from touch start — recover start X
        grantX.current = evt.nativeEvent.locationX - gestureState.dx;
        const raw = rawFromX(grantX.current + gestureState.dx);
        setDragValue(raw);
        thumbLeftAnim.setValue(thumbLeftForValue(raw));
      },
      onPanResponderMove: (_, gestureState) => {
        if (!claimed.current) return;
        const raw = rawFromX(grantX.current + gestureState.dx);
        setDragValue(raw);
        thumbLeftAnim.setValue(thumbLeftForValue(raw));
      },
      onPanResponderRelease: (_, gestureState) => {
        commitFromX(grantX.current + gestureState.dx);
      },
      onPanResponderTerminate: () => {
        // Scroll won — restore previous value, do not commit 0%
        cancelDrag();
      },
    }),
  ).current;

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    trackWRef.current = w;
    setTrackW(w);
    thumbLeftAnim.setValue(thumbLeftForValue(propsRef.current.value));
  }

  const animatedFillWidth = Animated.subtract(
    Animated.add(thumbLeftAnim, THUMB_R),
    TRACK_PAD,
  );

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View
          style={[s.track, { backgroundColor: 'transparent' }]}
          onLayout={onLayout}
          {...pan.panHandlers}
        >
          <View style={[s.trackInner, { width: trackW || '100%' }]}>
            {/* Full inactive rail (dark) — always shows max length */}
            <View style={[s.rail, { backgroundColor: inactiveRail }]} />
            {isDragging ? (
              <Animated.View style={[s.fill, { backgroundColor: theme.accent, left: fillLeft, width: animatedFillWidth }]} />
            ) : (
              <View style={[s.fill, { backgroundColor: theme.accent, left: fillLeft, width: fillWidth }]} />
            )}
            <Animated.View
              style={[s.thumb, {
                backgroundColor: theme.accent,
                left: isDragging ? thumbLeftAnim : thumbLeft,
                borderColor: theme.card,
              }]}
            />
          </View>
        </View>
        <Text style={[s.val, { color: theme.text }]}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: {
    flex: 1,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    // Allow vertical scroll to pass through until we claim horizontal drag
  },
  trackInner: {
    height: 36,
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    left: TRACK_PAD,
    right: TRACK_PAD,
    top: 15,
    height: 6,
    borderRadius: 3,
  },
  fill: {
    position: 'absolute',
    top: 15,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_R,
    top: 7,
    borderWidth: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  val: { fontSize: 14, fontWeight: '700', minWidth: 44, textAlign: 'right' },
});
