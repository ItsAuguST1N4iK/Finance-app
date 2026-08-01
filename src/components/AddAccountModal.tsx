import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { BottomSheetModal } from './BottomSheetModal';
import { PressableScale } from './PressableScale';
import type { Platform } from '../types';
import { CARD_COLORS } from '../constants/cardColors';
import {
  commonStyles,
  fieldLabelStyle,
  inputStyle,
  selectChipStyle,
  selectChipTextStyle,
} from '../theme/commonStyles';
import { space } from '../theme/tokens';

const PLATFORMS: Platform[] = ['manual', 'monobank', 'privatbank', 'zen', 'ibkr'];
const CURRENCIES = ['UAH', 'USD', 'EUR', 'GBP'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (platform: Platform, name: string, currency: string, color: string) => void;
}

export function AddAccountModal({ visible, onClose, onAdd }: Props) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [platform, setPlatform] = useState<Platform>('manual');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [color, setColor] = useState(CARD_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setPlatform('manual');
      setName('');
      setCurrency('UAH');
      setColor(CARD_COLORS[0]);
    }
  }, [visible]);

  const footer = (
    <View style={commonStyles.sheetFooterRow}>
      <PressableScale
        style={[commonStyles.footerBtnGhost, { borderColor: theme.border }]}
        onPress={onClose}
      >
        <Text style={[commonStyles.footerBtnText, { color: theme.subtext }]}>{t.cancel}</Text>
      </PressableScale>
      <PressableScale
        style={[
          commonStyles.footerBtnPrimary,
          { backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.5 },
        ]}
        disabled={!name.trim()}
        onPress={() => { onAdd(platform, name.trim(), currency, color); onClose(); }}
      >
        <Text style={[commonStyles.footerBtnTextPrimary, { color: theme.onAccent }]}>{t.save}</Text>
      </PressableScale>
    </View>
  );

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={t.settingsAddAccount} footer={footer}>
      <Text style={fieldLabelStyle(theme.subtext)}>{t.settingsPlatform}</Text>
      <View style={[commonStyles.chipRow, { marginBottom: space[3] }]}>
        {PLATFORMS.map((p) => {
          const active = platform === p;
          return (
            <PressableScale
              key={p}
              onPress={() => setPlatform(p)}
              style={selectChipStyle(theme, active)}
            >
              <Text style={selectChipTextStyle(theme, active)}>{p}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={fieldLabelStyle(theme.subtext)}>{t.dashCardName}</Text>
      <TextInput
        style={[
          inputStyle({
            backgroundColor: theme.inputBg,
            borderColor: theme.border,
            color: theme.text,
          }),
          { marginBottom: space[3] },
        ]}
        value={name}
        onChangeText={setName}
        placeholder={t.settingsAddAccountName}
        placeholderTextColor={theme.subtext}
      />

      <Text style={fieldLabelStyle(theme.subtext)}>{t.txCurrency}</Text>
      <View style={[commonStyles.chipRow, { marginBottom: space[3] }]}>
        {CURRENCIES.map((c) => {
          const active = currency === c;
          return (
            <PressableScale
              key={c}
              onPress={() => setCurrency(c)}
              style={selectChipStyle(theme, active)}
            >
              <Text style={selectChipTextStyle(theme, active)}>{c}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={fieldLabelStyle(theme.subtext)}>{t.dashCardColor}</Text>
      <View style={s.colorsRow}>
        {CARD_COLORS.map((c) => (
          <PressableScale
            key={c}
            style={[
              s.colorDot,
              { backgroundColor: c },
              c === color && { borderWidth: 3, borderColor: theme.onAccent, transform: [{ scale: 1.15 }] },
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2.5], marginBottom: space[2] },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
