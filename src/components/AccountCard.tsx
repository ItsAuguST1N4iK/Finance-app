import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import type { Account } from '../types';
import { currencySymbol } from '../utils/currency';
import { numberLocale } from '../utils/locale';
import { useLanguage } from '../i18n/LanguageContext';
import { HIT_ICON } from '../utils/hitSlop';

interface Props {
  account: Account;
  onEdit: () => void;
}

const CARD_W = 200;
const CARD_GAP = 12;
const SNAP = CARD_W + CARD_GAP;

export const ACCOUNT_CARD_SNAP = SNAP;
export const ACCOUNT_CARD_WIDTH = CARD_W;
export const ACCOUNT_CARD_GAP = CARD_GAP;

/** Flat card — no press scale, no selection highlight. */
export function AccountCard({ account, onEdit }: Props) {
  const { theme, cardSurface: glassCard } = useTheme();
  const { language } = useLanguage();
  const loc = numberLocale(language);
  const cardColor = account.color ?? '#1e293b';
  const surface = glassCard();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          surface,
          { borderColor: theme.border, borderWidth: surface.borderWidth || 1 },
        ]}
      >
        <View style={[styles.colorBar, { backgroundColor: cardColor }]} />
        <View style={[styles.tint, { backgroundColor: cardColor + '18' }]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.platform, { color: cardColor }]}>
              {account.platform.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onEdit} hitSlop={HIT_ICON} activeOpacity={0.75}>
              <Ionicons name="pencil-outline" size={14} color={theme.subtext} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.balance, { color: theme.text }]}>
            {account.balance != null
              ? `${account.balance.toLocaleString(loc)} ${currencySymbol(account.currency)}`
              : '—'}
          </Text>
          <Text style={[styles.name, { color: theme.subtext }]} numberOfLines={1}>
            {account.displayName ?? account.name}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_W,
    marginRight: CARD_GAP,
  },
  card: {
    borderRadius: 16,
    minHeight: 88,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  colorBar: {
    width: 3,
    borderRadius: 2,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    left: 3,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platform: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  balance: {
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 4,
  },
  name: {
    fontSize: 11,
  },
});
