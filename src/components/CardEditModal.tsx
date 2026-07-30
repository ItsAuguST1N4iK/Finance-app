import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { BottomSheetModal } from './BottomSheetModal';
import { CardPreview } from './CardPreview';
import type { Account } from '../types';
import { CARD_COLORS } from '../constants/cardColors';
import { ALL_CURRENCIES } from '../constants/currencies';

interface CardEditModalProps {
  account: Account;
  visible: boolean;
  onClose: () => void;
  /** When showCurrency is true, onSave receives currency as 3rd arg. */
  onSave: (name: string, color: string, currency?: string) => void;
  showCurrency?: boolean;
}

export function CardEditModal({
  account, visible, onClose, onSave, showCurrency = false,
}: CardEditModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState(account.displayName ?? account.name);
  const [color, setColor] = useState(account.color ?? '#3b82f6');
  const [currency, setCurrency] = useState(account.currency);

  useEffect(() => {
    if (visible) {
      setName(account.displayName ?? account.name);
      setColor(account.color ?? '#3b82f6');
      setCurrency(account.currency);
    }
  }, [visible, account]);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={t.dashEditCard}
      footer={(
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={onClose} activeOpacity={0.75}>
            <Text style={[styles.cancelText, { color: theme.subtext }]}>{t.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.accent }]}
            onPress={() => {
              onSave(
                name.trim() || account.name,
                color,
                showCurrency ? currency : undefined,
              );
              onClose();
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.saveBtnText, { color: theme.onAccent }]}>{t.save}</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <CardPreview account={account} name={name} color={color} />
      <Text style={[styles.label, { color: theme.subtext }]}>{t.dashCardName}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        value={name}
        onChangeText={setName}
        placeholder={account.name}
        placeholderTextColor={theme.subtext}
      />

      <Text style={[styles.label, { color: theme.subtext, marginTop: 12 }]}>{t.dashCardColor}</Text>
      <View style={styles.colorsRow}>
        {CARD_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              c === color && { borderWidth: 3, borderColor: theme.onAccent, transform: [{ scale: 1.15 }] },
            ]}
            onPress={() => setColor(c)}
            activeOpacity={0.75}
          />
        ))}
      </View>

      {showCurrency && (
        <>
          <Text style={[styles.label, { color: theme.subtext, marginTop: 12 }]}>{t.txCurrency}</Text>
          <View style={styles.currencyRow}>
            {ALL_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.currencyChip,
                  {
                    borderColor: currency === c ? theme.accent : theme.border,
                    backgroundColor: currency === c ? theme.accent + '22' : theme.cardAlt,
                  },
                ]}
                onPress={() => setCurrency(c)}
                activeOpacity={0.75}
              >
                <Text style={{ color: currency === c ? theme.accent : theme.subtext, fontWeight: '600' }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  currencyChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  footer: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
});
