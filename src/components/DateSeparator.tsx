import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function DateSeparator({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: theme.border }]} />
      <Text style={[styles.label, { color: theme.subtext, backgroundColor: theme.bg }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line: { flex: 1, height: 1 },
  label: { fontSize: 11, fontWeight: '600', paddingHorizontal: 10, textAlign: 'center' },
});
