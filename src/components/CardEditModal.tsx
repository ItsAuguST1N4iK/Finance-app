import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { BottomSheetModal } from './BottomSheetModal';
import { PressableScale } from './PressableScale';
import { CardPreview } from './CardPreview';
import type { Account } from '../types';
import { CARD_COLORS } from '../constants/cardColors';
import { ALL_CURRENCIES } from '../constants/currencies';
import {
  commonStyles,
  fieldLabelStyle,
  inputStyle,
  selectChipStyle,
  selectChipTextStyle,
} from '../theme/commonStyles';
import { space } from '../theme/tokens';

interface CardEditModalProps {
  account: Account | null;
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
  const [localAccount, setLocalAccount] = useState<Account | null>(account);
  const accountRef = useRef(account);
  accountRef.current = account;
  const [name, setName] = useState(account?.displayName ?? account?.name ?? '');
  const [color, setColor] = useState(account?.color ?? '#3b82f6');
  const [currency, setCurrency] = useState(account?.currency ?? 'UAH');

  useEffect(() => {
    if (!account) return;
    setLocalAccount(account);
    if (visible) {
      setName(account.displayName ?? account.name);
      setColor(account.color ?? '#3b82f6');
      setCurrency(account.currency);
    }
  }, [visible, account]);

  if (!localAccount) return null;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={() => {
        if (!accountRef.current) setLocalAccount(null);
      }}
      title={t.dashEditCard}
      footer={(
        <View style={commonStyles.sheetFooterRow}>
          <PressableScale
            style={[commonStyles.footerBtnGhost, { borderColor: theme.border }]}
            onPress={onClose}
          >
            <Text style={[commonStyles.footerBtnText, { color: theme.subtext }]}>{t.cancel}</Text>
          </PressableScale>
          <PressableScale
            style={[commonStyles.footerBtnPrimary, { backgroundColor: theme.accent }]}
            onPress={() => {
              onSave(
                name.trim() || localAccount.name,
                color,
                showCurrency ? currency : undefined,
              );
              onClose();
            }}
          >
            <Text style={[commonStyles.footerBtnTextPrimary, { color: theme.onAccent }]}>{t.save}</Text>
          </PressableScale>
        </View>
      )}
    >
      <CardPreview account={localAccount} name={name} color={color} />
      <Text style={[fieldLabelStyle(theme.subtext), { marginTop: space[3] }]}>{t.dashCardName}</Text>
      <TextInput
        style={inputStyle({
          backgroundColor: theme.inputBg,
          borderColor: theme.border,
          color: theme.text,
        })}
        value={name}
        onChangeText={setName}
        placeholder={localAccount.name}
        placeholderTextColor={theme.subtext}
      />

      <Text style={[fieldLabelStyle(theme.subtext), { marginTop: space[3] }]}>{t.dashCardColor}</Text>
      <View style={styles.colorsRow}>
        {CARD_COLORS.map((c) => (
          <PressableScale
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              c === color && { borderWidth: 3, borderColor: theme.onAccent, transform: [{ scale: 1.15 }] },
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      {showCurrency && (
        <>
          <Text style={[fieldLabelStyle(theme.subtext), { marginTop: space[3] }]}>{t.txCurrency}</Text>
          <View style={commonStyles.chipRow}>
            {ALL_CURRENCIES.map((c) => {
              const active = currency === c;
              return (
                <PressableScale
                  key={c}
                  style={selectChipStyle(theme, active)}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={selectChipTextStyle(theme, active)}>{c}</Text>
                </PressableScale>
              );
            })}
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2.5] },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
