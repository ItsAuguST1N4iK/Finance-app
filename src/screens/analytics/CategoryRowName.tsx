import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useCategoryLabel } from '../../hooks/useCategoryLabels';

export function CategoryRowName({ categoryKey }: { categoryKey: string }) {
  const { theme } = useTheme();
  const label = useCategoryLabel(categoryKey);
  return <Text style={[styles.catName, { color: theme.text }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  catName: { fontSize: 14 },
});
