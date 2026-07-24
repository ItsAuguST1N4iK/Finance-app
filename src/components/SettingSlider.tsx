import React, { useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function snap(value: number, min: number, max: number, step: number): number {
  const steps = Math.round((value - min) / step);
  const snapped = min + steps * step;
  return Math.max(min, Math.min(max, +snapped.toFixed(4)));
}

export function SettingSlider({ value, min, max, step, onChange, format }: Props) {
  const { theme } = useTheme();
  const trackW = useRef(0);
  const pct = (value - min) / (max - min);
  const label = format ? format(value) : value.toFixed(2);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (trackW.current <= 0) return;
        const x = evt.nativeEvent.locationX;
        onChange(snap(min + (x / trackW.current) * (max - min), min, max, step));
      },
      onPanResponderMove: (evt) => {
        if (trackW.current <= 0) return;
        const x = Math.max(0, Math.min(trackW.current, evt.nativeEvent.locationX));
        onChange(snap(min + (x / trackW.current) * (max - min), min, max, step));
      },
    }),
  ).current;

  function onLayout(e: LayoutChangeEvent) {
    trackW.current = e.nativeEvent.layout.width;
  }

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View
          style={[s.track, { backgroundColor: theme.border }]}
          onLayout={onLayout}
          {...pan.panHandlers}
        >
          <View style={[s.fill, { backgroundColor: theme.accent, width: `${pct * 100}%` }]} />
          <View
            style={[s.thumb, {
              backgroundColor: theme.accent,
              left: `${pct * 100}%`,
              borderColor: theme.card,
            }]}
          />
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
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 11,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    top: 3,
    borderWidth: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  val: { fontSize: 14, fontWeight: '700', minWidth: 44, textAlign: 'right' },
});
