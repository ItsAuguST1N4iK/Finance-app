import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { Account } from '../types';
import { currencySymbol } from '../utils/currency';
import { numberLocale } from '../utils/locale';

interface Props {
  account: Account;
  name: string;
  color: string;
}

export function CardPreview({ account, name, color }: Props) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const loc = numberLocale(language);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: color, borderWidth: 2 }]}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={[styles.tint, { backgroundColor: color + '18' }]} />
      <View style={styles.content}>
        <Text style={[styles.platform, { color }]}>{account.platform.toUpperCase()}</Text>
        <Text style={[styles.balance, { color: theme.text }]}>
          {account.balance != null
            ? `${account.balance.toLocaleString(loc)} ${currencySymbol(account.currency)} ${account.currency}`
            : '—'}
        </Text>
        <Text style={[styles.name, { color: theme.subtext }]} numberOfLines={1}>
          {name || account.name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    minHeight: 96,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 16,
  },
  colorBar: { width: 3, borderRadius: 2 },
  tint: { ...StyleSheet.absoluteFillObject, left: 3 },
  content: { flex: 1, padding: 14, justifyContent: 'space-between' },
  platform: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  balance: { fontSize: 18, fontWeight: '800', marginVertical: 4 },
  name: { fontSize: 12 },
});
