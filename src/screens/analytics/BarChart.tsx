import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Rect, Text as SvgText, Line, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ChartBar } from '../../types';
import { computeYearBands, computePerBarBands, isYearGranularity, type ChartGranularity } from '../../utils/chartGranularity';
import { smoothBezierPath } from './smoothBezierPath';

export function BarChart({ bars, subTextColor, width, granularity, periodFooter }: {
  bars: ChartBar[];
  subTextColor: string;
  width: number;
  granularity: ChartGranularity;
  periodFooter?: string;
}) {
  const { theme } = useTheme();
  if (bars.length === 0) return null;

  const height = 218;
  const padL   = 8;
  const padR   = 8;
  const padT   = 24;
  const padB   = 52;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const baseline = padT + chartH;
  const yearBandH = 16;
  const yearBandY = height - yearBandH - 2;

  const yearMode = isYearGranularity(granularity);
  const dailyMode = granularity === 'daily';
  const bandMode = yearMode;
  const yearBands = bandMode ? computePerBarBands(bars) : computeYearBands(bars);
  const showYearBands = bandMode
    ? yearBands.length > 0
    : dailyMode
      ? false
      : yearBands.length > 1 || (yearBands.length === 1 && bars.length > 4);
  const hideTextLabels = bandMode;
  const hasPeriodFooter = !!periodFooter && !showYearBands;
  const labelY = hasPeriodFooter
    ? baseline + 10
    : showYearBands
      ? baseline + 14
      : height - 8;

  const maxVal = Math.max(...bars.map((b) => Math.max(b.income, b.expense)), 1);

  const guideLines = [0.25, 0.5, 0.75, 1.0].map((frac) => ({
    y: padT + chartH - frac * chartH,
    val: (maxVal * frac),
  }));

  const minGroupW = granularity === 'monthly' ? 34 : 28;
  const showEvery = bars.length * minGroupW > chartW
    ? Math.ceil((bars.length * minGroupW) / chartW / 2)
    : bars.length > 20
      ? Math.ceil(bars.length / 12)
      : 1;
  const groupW    = chartW / bars.length;
  const gap       = Math.max(1, groupW * 0.08);
  const barW      = Math.max(2, Math.floor((groupW - gap) / 2) - 1);

  const incomePts  = bars.map((b, i) => ({
    x: padL + i * groupW + groupW / 2,
    y: padT + chartH - Math.max(2, (b.income / maxVal) * chartH),
  }));
  const expensePts = bars.map((b, i) => ({
    x: padL + i * groupW + groupW / 2,
    y: padT + chartH - Math.max(2, (b.expense / maxVal) * chartH),
  }));

  const incomePath  = smoothBezierPath(incomePts);
  const expensePath = smoothBezierPath(expensePts);

  const incomeAreaPath  = incomePath  + ` L ${incomePts[incomePts.length - 1].x},${baseline} L ${incomePts[0].x},${baseline} Z`;
  const expenseAreaPath = expensePath + ` L ${expensePts[expensePts.length - 1].x},${baseline} L ${expensePts[0].x},${baseline} Z`;

  return (
    <Svg width={width} height={height}>
      {guideLines.map((gl, idx) => (
        <React.Fragment key={idx}>
          <Line
            x1={padL} y1={gl.y}
            x2={width - padR} y2={gl.y}
            stroke={subTextColor} strokeWidth={0.4} opacity={0.2}
            strokeDasharray="4,4"
          />
        </React.Fragment>
      ))}
      <Path d={incomeAreaPath}  fill={theme.income}  opacity={0.08} />
      <Path d={expenseAreaPath} fill={theme.expense} opacity={0.08} />
      {bars.map((bar, i) => {
        const groupX    = padL + i * groupW;
        const incomeH   = Math.max(2, (bar.income / maxVal) * chartH);
        const expenseH  = Math.max(2, (bar.expense / maxVal) * chartH);
        const centerX   = groupX + (groupW - barW * 2 - gap) / 2;
        const incomeX   = centerX;
        const expenseX  = centerX + barW + gap;
        const showLabel = !hideTextLabels && i % showEvery === 0;

        return (
          <React.Fragment key={i}>
            <Rect x={incomeX} y={padT + chartH - incomeH} width={barW} height={incomeH}
              rx={Math.min(barW / 2, 3)} fill={theme.income} opacity={0.65} />
            <Rect x={expenseX} y={padT + chartH - expenseH} width={barW} height={expenseH}
              rx={Math.min(barW / 2, 3)} fill={theme.expense} opacity={0.65} />
            {showLabel && (
              <SvgText
                x={groupX + groupW / 2}
                y={labelY}
                fontSize={dailyMode ? 8 : 9}
                fill={subTextColor}
                textAnchor="middle"
              >
                {bar.label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
      {showYearBands && yearBands.map((band) => {
        const x1 = padL + band.startIdx * groupW;
        const x2 = padL + (band.endIdx + 1) * groupW;
        const cx = (x1 + x2) / 2;
        return (
          <React.Fragment key={`y-${band.year}-${band.startIdx}`}>
            <Rect
              x={x1 + 1}
              y={yearBandY}
              width={Math.max(0, x2 - x1 - 2)}
              height={yearBandH}
              fill={theme.accent}
              opacity={0.28}
              rx={3}
            />
            <Line
              x1={x1 + 1}
              y1={yearBandY}
              x2={x2 - 1}
              y2={yearBandY}
              stroke={theme.accent}
              strokeWidth={2}
            />
            <SvgText
              x={cx}
              y={yearBandY + yearBandH - 3}
              fontSize={yearMode ? 9 : 11}
              fill={theme.accent}
              textAnchor="middle"
            >
              {band.label ?? band.year}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Path d={incomePath}  fill="none" stroke={theme.income}  strokeWidth={2} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={expensePath} fill="none" stroke={theme.expense} strokeWidth={2} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
      {incomePts.filter((_, i) => i % showEvery === 0).map((pt, i) => (
        <Line key={`id${i}`} x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y} stroke={theme.income} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
      ))}
      {expensePts.filter((_, i) => i % showEvery === 0).map((pt, i) => (
        <Line key={`ed${i}`} x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y} stroke={theme.expense} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
      ))}
      {hasPeriodFooter && (
        <React.Fragment>
          <Rect x={padL + 1} y={yearBandY} width={chartW - 2} height={yearBandH}
            fill={theme.accent} opacity={0.28} rx={3} />
          <Line x1={padL + 1} y1={yearBandY} x2={width - padR - 1} y2={yearBandY}
            stroke={theme.accent} strokeWidth={2} />
          <SvgText x={width / 2} y={yearBandY + yearBandH - 3} fontSize={10}
            fill={theme.accent} textAnchor="middle">{periodFooter}</SvgText>
        </React.Fragment>
      )}
      <Line x1={padL} y1={baseline} x2={width - padR} y2={baseline}
        stroke={subTextColor} strokeWidth={0.6} opacity={0.4} />
    </Svg>
  );
}

export function ChartLegend() {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  return (
    <View style={legendStyles.row}>
      <View style={legendStyles.item}>
        <View style={[legendStyles.dot, { backgroundColor: theme.income }]} />
        <Text style={[legendStyles.label, { color: theme.subtext }]}>{t.analyticsShowIncome}</Text>
      </View>
      <View style={legendStyles.item}>
        <View style={[legendStyles.dot, { backgroundColor: theme.expense }]} />
        <Text style={[legendStyles.label, { color: theme.subtext }]}>{t.analyticsShowExpense}</Text>
      </View>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 16, marginBottom: 8 },
  item:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:   { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 12 },
});
