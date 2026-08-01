import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { PressableScale } from '../../components/PressableScale';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import {
  saveCustomCategory,
  type CategoryImpact,
  type EditableCategory,
} from '../../utils/categoryImpact';
import { CARD_COLORS } from '../../constants/cardColors';
import {
  commonStyles,
  fieldLabelStyle,
  inputStyle,
  selectChipStyle,
  selectChipTextStyle,
} from '../../theme/commonStyles';
import { space } from '../../theme/tokens';

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
      footer={(
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
              { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 },
            ]}
            disabled={!canSave}
            onPress={handleSave}
          >
            <Text style={[commonStyles.footerBtnTextPrimary, { color: theme.onAccent }]}>{t.save}</Text>
          </PressableScale>
        </View>
      )}
    >
      <Text style={fieldLabelStyle(theme.subtext)}>{t.settingsCategoryName}</Text>
      <TextInput
        style={[
          inputStyle({
            backgroundColor: theme.inputBg,
            borderColor: theme.border,
            color: theme.text,
          }),
          { marginBottom: space[3] + 2 },
        ]}
        value={name}
        onChangeText={setName}
        placeholder={t.settingsCategoryName}
        placeholderTextColor={theme.subtext}
      />

      <Text style={fieldLabelStyle(theme.subtext)}>{t.settingsCategoryImpact}</Text>
      <View style={[commonStyles.chipRow, { marginBottom: space[3] + 2 }]}>
        {IMPACTS.map((imp) => {
          const active = impact === imp;
          return (
            <PressableScale
              key={imp}
              onPress={() => setImpact(imp)}
              style={selectChipStyle(theme, active)}
            >
              <Text style={[selectChipTextStyle(theme, active), { fontSize: 13 }]}>
                {impactLabel[imp]}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={fieldLabelStyle(theme.subtext)}>{t.settingsCategoryColor}</Text>
      <View style={styles.colorsRow}>
        {CARD_COLORS.map((c) => (
          <PressableScale
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color === c && { borderWidth: 3, borderColor: theme.onAccent },
            ]}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2.5], marginBottom: space[2] },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
});
