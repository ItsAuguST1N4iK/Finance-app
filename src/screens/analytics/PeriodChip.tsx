import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export function PeriodChip({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[pStyles.btn, { borderColor: theme.border },
        active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <Text style={[pStyles.label, { color: active ? theme.onAccent : theme.subtext }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const pStyles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '500' },
});
