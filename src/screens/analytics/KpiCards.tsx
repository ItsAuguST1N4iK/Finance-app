import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { radius, space, stroke, type } from '../../theme/tokens';

export interface KpiData {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  sub?: string;
}

export function KpiCards({ items }: { items: KpiData[] }) {
  const { theme, cardSurface } = useTheme();
  const surface = cardSurface();
  return (
    <View style={kpiStyles.row}>
      {items.map((item, idx) => (
        <View
          key={idx}
          style={[kpiStyles.card, surface, {
            borderLeftColor: item.color,
            borderLeftWidth: 3,
          }]}
        >
          <View style={kpiStyles.cardTop}>
            <Text style={[kpiStyles.label, { color: theme.subtext }]}>{item.label}</Text>
            <View style={[kpiStyles.iconWrap, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={14} color={item.color} />
            </View>
          </View>
          <Text style={[kpiStyles.value, { color: item.color }]} numberOfLines={1} adjustsFontSizeToFit>
            {item.value}
          </Text>
          {item.sub ? (
            <Text style={[kpiStyles.sub, { color: theme.subtext }]}>{item.sub}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space[3],
    gap: space[2],
    marginBottom: space[3],
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: stroke.width,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  label: { ...type.meta },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { ...type.kpi },
  sub: { fontSize: 11, marginTop: 4 },
});
