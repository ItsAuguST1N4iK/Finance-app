import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { numberLocale } from '../../utils/locale';
import type { PlatformShareItem } from './PlatformShareBar';

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  if (end - start >= 359.9) {
    // Full circle as two half-arcs
    const mid = start + 180;
    const a = polar(cx, cy, r, start);
    const b = polar(cx, cy, r, mid);
    const c = polar(cx, cy, r, end);
    return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${c.x} ${c.y} Z`;
  }
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export function SharePie({ title, items }: { title?: string; items: PlatformShareItem[] }) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const loc = numberLocale(language);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;

  if (items.length === 0) return null;

  const fmt = (v: number) => v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString(loc, { maximumFractionDigits: 0 });

  let angle = 0;
  const slices = items.map((item) => {
    const sweep = Math.max(0.5, (item.pct / 100) * 360);
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...item, start, end };
  });

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text style={[styles.subTitle, { color: theme.subtext }]}>{title}</Text>
      ) : null}
      <View style={styles.pieRow}>
        <Svg width={size} height={size}>
          {slices.map((s) => (
            <Path
              key={s.accountId}
              d={slicePath(cx, cy, r, s.start, s.end)}
              fill={s.color}
            />
          ))}
          <Circle cx={cx} cy={cy} r={34} fill={theme.card} />
        </Svg>
        <View style={styles.legend}>
          {items.map((item) => (
            <View key={item.accountId} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {item.accountName}
              </Text>
              <Text style={[styles.pct, { color: theme.subtext }]}>
                {item.pct.toFixed(0)}%
              </Text>
              <Text style={[styles.amt, { color: theme.text }]}>{fmt(item.total)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  subTitle: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 10,
  },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 12, fontWeight: '600' },
  pct: { fontSize: 11, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  amt: { fontSize: 11, fontWeight: '700', minWidth: 40, textAlign: 'right' },
});
