import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { BottomSheetModal } from './BottomSheetModal';
import type { Platform } from '../types';
import { CARD_COLORS } from '../constants/cardColors';

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
    <View style={s.actions}>
      <TouchableOpacity style={[s.btn, s.btnGhost, { borderColor: theme.border }]} onPress={onClose}>
        <Text style={[s.btnGhostText, { color: theme.subtext }]}>{t.cancel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.btn, s.btnPrimary, { backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.5 }]}
        disabled={!name.trim()}
        onPress={() => { onAdd(platform, name.trim(), currency, color); onClose(); }}
      >
        <Text style={[s.btnPrimaryText, { color: theme.onAccent }]}>{t.save}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={t.settingsAddAccount} footer={footer}>
      <Text style={[s.label, { color: theme.subtext }]}>{t.settingsPlatform}</Text>
      <View style={s.chips}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPlatform(p)}
            style={[s.chip, {
              borderColor: platform === p ? theme.accent : theme.border,
              backgroundColor: platform === p ? theme.accent + '22' : theme.cardAlt,
            }]}
          >
            <Text style={{ color: platform === p ? theme.accent : theme.subtext, fontSize: 12, fontWeight: '600' }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.label, { color: theme.subtext }]}>{t.dashCardName}</Text>
      <TextInput
        style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        value={name}
        onChangeText={setName}
        placeholder={t.settingsAddAccountName}
        placeholderTextColor={theme.subtext}
      />

      <Text style={[s.label, { color: theme.subtext }]}>{t.txCurrency}</Text>
      <View style={[s.chips, { marginBottom: 8 }]}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCurrency(c)}
            style={[s.chip, {
              borderColor: currency === c ? theme.accent : theme.border,
              backgroundColor: currency === c ? theme.accent + '22' : theme.cardAlt,
            }]}
          >
            <Text style={{ color: currency === c ? theme.accent : theme.subtext, fontWeight: '600' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.label, { color: theme.subtext }]}>{t.dashCardColor}</Text>
      <View style={s.colorsRow}>
        {CARD_COLORS.map((c) => (
          <TouchableOpacity
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
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, marginBottom: 12 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  btnGhost: { borderWidth: 1 },
  btnGhostText: { fontWeight: '600' },
  btnPrimary: {},
  btnPrimaryText: { fontWeight: '700' },
});
