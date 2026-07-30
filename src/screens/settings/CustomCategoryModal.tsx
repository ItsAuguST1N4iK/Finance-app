import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import {
  saveCustomCategory,
  type CategoryImpact,
  type EditableCategory,
} from '../../utils/categoryImpact';
import { CARD_COLORS } from '../../constants/cardColors';

const IMPACTS: CategoryImpact[] = ['expense', 'income', 'fee', 'neutral'];

export function CustomCategoryModal({
  visible,
  category,
  onClose,
  onSaved,
}: {
  visible: boolean;
  category?: EditableCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0] ?? '#3b82f6');
  const [impact, setImpact] = useState<CategoryImpact>('expense');

  useEffect(() => {
    if (!visible) return;
    if (category) {
      setName(category.name);
      setColor(category.color);
      setImpact(category.impact);
    } else {
      setName('');
      setColor(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)] ?? '#3b82f6');
      setImpact('expense');
    }
  }, [visible, category]);

  const canSave = name.trim().length > 0;

  const impactLabel: Record<CategoryImpact, string> = {
    expense: t.settingsTagImpactExpense,
    income: t.settingsTagImpactIncome,
    fee: t.settingsTagImpactFee,
    neutral: t.settingsTagImpactNeutral,
  };

  function handleSave() {
    if (!canSave) return;
    saveCustomCategory({
      id: category?.id ?? undefined,
      key: category?.key,
      name: name.trim(),
      color,
      impact,
    });
    onSaved();
    onClose();
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={category ? t.settingsEditCategory : t.settingsAddCategory}
      scroll
      maxHeight="85%"
      footer={(
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 13, alignItems: 'center' }}
            onPress={onClose}
          >
            <Text style={{ color: theme.subtext, fontWeight: '600' }}>{t.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 2, borderRadius: 10, padding: 13, alignItems: 'center',
              backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5,
            }}
            disabled={!canSave}
            onPress={handleSave}
          >
            <Text style={{ color: theme.onAccent, fontWeight: '700' }}>{t.save}</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>
        {t.settingsCategoryName}
      </Text>
      <TextInput
        style={{
          borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15,
          backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 14,
        }}
        value={name}
        onChangeText={setName}
        placeholder={t.settingsCategoryName}
        placeholderTextColor={theme.subtext}
      />

      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 8 }}>
        {t.settingsCategoryImpact}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {IMPACTS.map((imp) => {
          const active = impact === imp;
          return (
            <TouchableOpacity
              key={imp}
              onPress={() => setImpact(imp)}
              style={{
                paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
              }}
            >
              <Text style={{ color: active ? theme.accent : theme.subtext, fontSize: 13, fontWeight: '600' }}>
                {impactLabel[imp]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 8 }}>
        {t.settingsCategoryColor}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        {CARD_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={{
              width: 34, height: 34, borderRadius: 17, backgroundColor: c,
              borderWidth: color === c ? 3 : 0,
              borderColor: theme.onAccent,
            }}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
}
