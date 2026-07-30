import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface ChipProps { label: string; onRemove: () => void; }

export function FilterChip({ label, onRemove }: ChipProps) {
  const { theme } = useTheme();
  return (
    <View style={[chipStyles.chip, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '66' }]}>
      <Text style={[chipStyles.label, { color: theme.accent }]} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }} activeOpacity={0.75}>
        <Ionicons name="close" size={13} color={theme.accent} />
      </TouchableOpacity>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, gap: 5, flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: '600' },
});
