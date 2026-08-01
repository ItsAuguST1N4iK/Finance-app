import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { PressableScale } from '../../components/PressableScale';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { saveCategoryRule, buildRuleDisplayName } from '../../utils/categoryRules';
import type { CategoryRule, RuleMatchField, RuleMatchOp } from '../../utils/categoryRules';
import { useCategoryLabels, useAllPickerCategoryKeys } from '../../hooks/useCategoryLabels';
import { GroupLabel } from './Section';
import {
  commonStyles,
  fieldLabelStyle,
  inputStyle,
  selectChipStyle,
  selectChipTextStyle,
} from '../../theme/commonStyles';
import { space } from '../../theme/tokens';

const RULE_FIELDS: RuleMatchField[] = ['description', 'mcc', 'amount', 'platform', 'type', 'currency'];
const RULE_OPS: RuleMatchOp[] = ['contains', 'equals', 'regex', 'range'];

export function CategoryRuleModal({
  visible, rule, onClose, onSaved,
}: {
  visible: boolean;
  rule?: CategoryRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const categoryLabels = useCategoryLabels();
  const pickerKeys = useAllPickerCategoryKeys();
  const [name, setName] = useState('');
  const [matchField, setMatchField] = useState<RuleMatchField>('description');
  const [matchOp, setMatchOp] = useState<RuleMatchOp>('contains');
  const [matchValue, setMatchValue] = useState('');
  const [categoryKey, setCategoryKey] = useState<string>('other');
  const [priority, setPriority] = useState('10');

  useEffect(() => {
    if (!visible) return;
    if (rule) {
      setName(rule.name);
      setMatchField(rule.matchField);
      setMatchOp(rule.matchOp);
      setMatchValue(rule.matchValue);
      setCategoryKey(rule.categoryKey);
      setPriority(String(rule.priority));
    } else {
      setName('');
      setMatchField('description');
      setMatchOp('contains');
      setMatchValue('');
      setCategoryKey('other');
      setPriority('10');
    }
  }, [visible, rule]);

  const fieldLabels: Record<RuleMatchField, string> = {
    mcc: t.ruleFieldMcc,
    description: t.ruleFieldDescription,
    amount: t.ruleFieldAmount,
    platform: t.ruleFieldPlatform,
    type: t.ruleFieldType,
    currency: t.ruleFieldCurrency,
  };
  const opLabels: Record<RuleMatchOp, string> = {
    contains: t.ruleOpContains,
    equals: t.ruleOpEquals,
    regex: t.ruleOpRegex,
    range: t.ruleOpRange,
  };

  const canSave = matchValue.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const trimmedValue = matchValue.trim();
    const ruleName = name.trim()
      || buildRuleDisplayName(matchField, matchOp, trimmedValue, categoryKey);
    saveCategoryRule({
      id: rule?.id,
      name: ruleName,
      categoryKey,
      priority: parseInt(priority, 10) || 10,
      matchField,
      matchOp,
      matchValue: trimmedValue,
      enabled: rule?.enabled ?? true,
    });
    onSaved();
    onClose();
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={rule ? t.settingsEditRule : t.settingsAddRule}
      subtitle={t.settingsRuleOptionalHint}
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
      <Text style={fieldLabelStyle(theme.subtext)}>{t.settingsRuleName}</Text>
      <TextInput
        style={inputStyle({
          backgroundColor: theme.inputBg,
          borderColor: theme.border,
          color: theme.text,
        })}
        value={name}
        onChangeText={setName}
        placeholder={t.settingsRuleNameOptional}
        placeholderTextColor={theme.subtext}
      />
      <View style={{ height: space[3] }} />

      <GroupLabel label={t.settingsRuleField} />
      <View style={[commonStyles.chipRow, { marginBottom: space[3] }]}>
        {RULE_FIELDS.map((f) => {
          const active = matchField === f;
          return (
            <PressableScale key={f} onPress={() => setMatchField(f)} style={selectChipStyle(theme, active)}>
              <Text style={selectChipTextStyle(theme, active)}>{fieldLabels[f]}</Text>
            </PressableScale>
          );
        })}
      </View>

      <GroupLabel label={t.settingsRuleOp} />
      <View style={[commonStyles.chipRow, { marginBottom: space[3] }]}>
        {RULE_OPS.map((op) => {
          const active = matchOp === op;
          return (
            <PressableScale key={op} onPress={() => setMatchOp(op)} style={selectChipStyle(theme, active)}>
              <Text style={selectChipTextStyle(theme, active)}>{opLabels[op]}</Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={fieldLabelStyle(theme.subtext)}>{t.settingsRuleValue}</Text>
      <TextInput
        style={inputStyle({
          backgroundColor: theme.inputBg,
          borderColor: theme.border,
          color: theme.text,
        })}
        value={matchValue}
        onChangeText={setMatchValue}
        placeholder={matchOp === 'range' ? '100-5000' : 'steam|xbox'}
        placeholderTextColor={theme.subtext}
      />
      <View style={{ height: space[3] }} />

      <GroupLabel label={t.settingsRuleCategory} />
      <View style={[commonStyles.chipRow, { marginBottom: space[3] }]}>
        {pickerKeys.map((k) => {
          const active = categoryKey === k;
          return (
            <PressableScale key={k} onPress={() => setCategoryKey(k)} style={selectChipStyle(theme, active)}>
              <Text style={selectChipTextStyle(theme, active, 'sm')}>
                {categoryLabels[k] ?? k}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <GroupLabel label={t.settingsRulePriority} />
      <Text style={{ fontSize: 12, color: theme.subtext, lineHeight: 17, marginBottom: 10 }}>
        {t.settingsRulePriorityHint}
      </Text>
      <View style={[commonStyles.chipRow, { marginBottom: space[2] }]}>
        {([
          { value: 0, label: t.settingsScraperRuleBadge },
          { value: 1, label: t.rulePriorityLow },
          { value: 10, label: t.rulePriorityNormal },
          { value: 50, label: t.rulePriorityHigh },
          { value: 100, label: t.rulePriorityCritical },
        ] as const).map((p) => {
          const active = parseInt(priority, 10) === p.value;
          return (
            <PressableScale
              key={p.value}
              onPress={() => setPriority(String(p.value))}
              style={[selectChipStyle(theme, active), { width: '47%' }]}
            >
              <Text style={{
                color: active ? theme.accent : theme.text,
                fontSize: 13,
                fontWeight: '700',
              }}>
                {p.label}
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>
                {t.settingsRulePriorityValue.replace('{n}', String(p.value))}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: theme.subtext, marginBottom: 8, lineHeight: 15 }}>
        {t.settingsRulePriorityExplain}
      </Text>
    </BottomSheetModal>
  );
}
