import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, stroke } from '../theme/tokens';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IonName;
  title: string;
  subtitle?: string;
  /** Extra top/bottom padding for list empties */
  compact?: boolean;
};

/**
 * Shared empty-state block used on Dashboard, Transactions, Planner, Analytics, Settings.
 */
export function EmptyState({ icon, title, subtitle, compact }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '44' }]}>
        <Ionicons name={icon} size={36} color={theme.accent} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 28,
  },
  compact: {
    paddingVertical: 48,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: stroke.width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: space[4],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: space[2],
    lineHeight: 20,
  },
});
