import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenStore } from '../../security/tokenStore';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppAlert } from '../../components/AppAlert';
import { makeStyles } from './settingsStyles';

export function TokenBlock({
  title, tokenKey, instructions, onSaved,
}: {
  title: string; tokenKey: string;
  instructions: string; onSaved: () => void;
}) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const { show, element: alertEl } = useAppAlert();
  const [value,     setValue]     = useState('');
  const [saved,     setSaved]     = useState(false);
  const [stored,    setStored]    = useState<string | null>(null);
  const [showPwd,   setShowPwd]   = useState(false);
  const [showStored,setShowStored]= useState(false);
  const [showInstr, setShowInstr] = useState(false);
  const s = useMemo(() => makeStyles(theme), [theme]);

  async function loadStored() {
    const v = await tokenStore.get(tokenKey);
    setSaved(!!v);
    setStored(v);
  }

  useEffect(() => {
    loadStored();
  }, [tokenKey]);

  function maskToken(raw: string): string {
    if (raw.length <= 8) return '••••••••';
    return `${raw.slice(0, 4)}${'•'.repeat(Math.min(12, raw.length - 8))}${raw.slice(-4)}`;
  }

  async function handleSave() {
    if (!value.trim()) return;
    await tokenStore.set(tokenKey, value.trim());
    setSaved(true);
    setStored(value.trim());
    setValue('');
    setShowStored(false);
    show(t.tokenSaved, `${title} ${t.tokenSavedHint}`);
    onSaved();
  }

  function handleDelete() {
    show(t.deleteToken, `${title} ${t.deleteTokenConfirm}`, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: async () => {
          await tokenStore.delete(tokenKey);
          setSaved(false);
          setStored(null);
          setValue('');
          setShowStored(false);
        },
      },
    ]);
  }

  return (
    <View style={s.tokenBlock}>
      {alertEl}
      <View style={s.tokenHeader}>
        <Text style={s.tokenTitle}>{title}</Text>
        {saved && (
          <View style={s.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.income} />
            <Text style={[s.savedText, { color: theme.income }]}>{t.connected}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={s.instrToggle} onPress={() => setShowInstr((v) => !v)} activeOpacity={0.75}>
        <Ionicons name={showInstr ? 'chevron-up' : 'information-circle-outline'} size={14} color={theme.accent} />
        <Text style={[s.instrToggleText, { color: theme.accent }]}>
          {showInstr ? t.cancel : t.settingsHowToGet}
        </Text>
      </TouchableOpacity>
      {showInstr && (
        <View style={[s.instrBox, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[s.instrText, { color: theme.subtext }]}>{instructions}</Text>
        </View>
      )}
      {!saved && (
        <>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder={t.pasteToken}
              placeholderTextColor={theme.subtext}
              value={value}
              onChangeText={setValue}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(!showPwd)} activeOpacity={0.75}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.subtext} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.saveBtn, !value.trim() && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!value.trim()}
            activeOpacity={0.75}
          >
            <Text style={s.saveBtnText}>{t.save}</Text>
          </TouchableOpacity>
        </>
      )}
      {saved && (
        <>
          <TouchableOpacity
            style={[s.viewTokenBtn, { borderColor: theme.border, backgroundColor: theme.cardAlt }]}
            onPress={() => setShowStored((v) => !v)}
            activeOpacity={0.75}
          >
            <Ionicons name={showStored ? 'eye-off-outline' : 'key-outline'} size={16} color={theme.accent} />
            <Text style={[s.viewTokenText, { color: theme.accent }]}>
              {showStored ? t.tokenHide : t.tokenView}
            </Text>
          </TouchableOpacity>
          {showStored && stored && (
            <View style={[s.storedTokenBox, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Text style={[s.storedTokenValue, { color: theme.text }]} selectable>
                {showPwd ? stored : maskToken(stored)}
              </Text>
              <TouchableOpacity onPress={() => setShowPwd((v) => !v)} activeOpacity={0.75} style={s.eyeBtn}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.subtext} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={14} color={theme.expense} />
            <Text style={[s.deleteBtnText, { color: theme.expense }]}>{t.disconnect}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
