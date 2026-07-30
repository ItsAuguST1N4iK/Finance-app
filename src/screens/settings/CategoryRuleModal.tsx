import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { saveCategoryRule, buildRuleDisplayName } from '../../utils/categoryRules';
import type { CategoryRule, RuleMatchField, RuleMatchOp } from '../../utils/categoryRules';
import { useCategoryLabels, useAllPickerCategoryKeys } from '../../hooks/useCategoryLabels';
import { GroupLabel } from './Section';

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
      maxHeight="90%"
      footer={(
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 13, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ color: theme.subtext, fontWeight: '600' }}>{t.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 2, borderRadius: 10, padding: 13, alignItems: 'center', backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }}
            disabled={!canSave}
            onPress={handleSave}
          >
            <Text style={{ color: theme.onAccent, fontWeight: '700' }}>{t.save}</Text>
          </TouchableOpacity>
        </View>
      )}
    >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.settingsRuleName}</Text>
              <TextInput
                style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 12 }}
                value={name} onChangeText={setName} placeholder={t.settingsRuleNameOptional} placeholderTextColor={theme.subtext}
              />
              <GroupLabel label={t.settingsRuleField} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {RULE_FIELDS.map((f) => (
                  <TouchableOpacity key={f} onPress={() => setMatchField(f)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: matchField === f ? theme.accent : theme.border,
                    backgroundColor: matchField === f ? theme.accent + '22' : theme.cardAlt,
                  }}>
                    <Text style={{ color: matchField === f ? theme.accent : theme.subtext, fontSize: 12, fontWeight: '600' }}>{fieldLabels[f]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <GroupLabel label={t.settingsRuleOp} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {RULE_OPS.map((op) => (
                  <TouchableOpacity key={op} onPress={() => setMatchOp(op)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: matchOp === op ? theme.accent : theme.border,
                    backgroundColor: matchOp === op ? theme.accent + '22' : theme.cardAlt,
                  }}>
                    <Text style={{ color: matchOp === op ? theme.accent : theme.subtext, fontSize: 12, fontWeight: '600' }}>{opLabels[op]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subtext, marginBottom: 6 }}>{t.settingsRuleValue}</Text>
              <TextInput
                style={{ borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 12 }}
                value={matchValue} onChangeText={setMatchValue} placeholder={matchOp === 'range' ? '100-5000' : 'steam|xbox'} placeholderTextColor={theme.subtext}
              />
              <GroupLabel label={t.settingsRuleCategory} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {pickerKeys.map((k) => (
                  <TouchableOpacity key={k} onPress={() => setCategoryKey(k)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: categoryKey === k ? theme.accent : theme.border,
                    backgroundColor: categoryKey === k ? theme.accent + '22' : theme.cardAlt,
                  }}>
                    <Text style={{ color: categoryKey === k ? theme.accent : theme.subtext, fontSize: 11, fontWeight: '600' }}>
                      {categoryLabels[k] ?? k}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <GroupLabel label={t.settingsRulePriority} />
              <Text style={{ fontSize: 12, color: theme.subtext, lineHeight: 17, marginBottom: 10 }}>
                {t.settingsRulePriorityHint}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {([
                  { value: 0, label: t.settingsScraperRuleBadge },
                  { value: 1, label: t.rulePriorityLow },
                  { value: 10, label: t.rulePriorityNormal },
                  { value: 50, label: t.rulePriorityHigh },
                  { value: 100, label: t.rulePriorityCritical },
                ] as const).map((p) => {
                  const active = parseInt(priority, 10) === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPriority(String(p.value))}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
                        width: '47%',
                      }}
                    >
                      <Text style={{ color: active ? theme.accent : theme.text, fontSize: 13, fontWeight: '700' }}>
                        {p.label}
                      </Text>
                      <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>
                        {t.settingsRulePriorityValue.replace('{n}', String(p.value))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ fontSize: 11, color: theme.subtext, marginBottom: 16, lineHeight: 15 }}>
                {t.settingsRulePriorityExplain}
              </Text>
    </BottomSheetModal>
  );
}
