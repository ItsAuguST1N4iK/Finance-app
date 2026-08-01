import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import { radius, stroke } from '../../theme/tokens';

interface ChipProps { label: string; onRemove: () => void; }

export function FilterChip({ label, onRemove }: ChipProps) {
  const { theme } = useTheme();
  return (
    <View style={[chipStyles.chip, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '66' }]}>
      <Text style={[chipStyles.label, { color: theme.accent }]} numberOfLines={1}>{label}</Text>
      <PressableScale onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }} scaleTo={0.88}>
        <Ionicons name="close" size={13} color={theme.accent} />
      </PressableScale>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: stroke.width,
    gap: 5,
    flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: '600' },
});
