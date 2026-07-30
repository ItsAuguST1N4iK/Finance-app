import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME_LABELS, ThemeKey, ACCENT_PRESETS } from '../../theme';
import { SettingSlider } from '../../components/SettingSlider';
import { Section, GroupLabel } from './Section';
import type { SettingsStyles } from './settingsStyles';

export function AppearanceSection({ s }: { s: SettingsStyles }) {
  const {
    theme, themeKey, accent, setThemeKey, setAccent,
    animationSpeed, transparencyPct,
    setAnimationSpeed, setTransparencyPct, cardSurface,
  } = useTheme();
  const { t } = useLanguage();

  return (
    <Section title={t.settingsAppearance} icon="color-palette-outline" defaultExpanded>
      <GroupLabel label={t.settingsTheme} />
      <View style={[s.themeRow, { marginBottom: 16 }]}>
        {(['dark', 'cursor', 'oled', 'light'] as ThemeKey[]).map((key) => {
          const colors: Record<ThemeKey, string> = {
            dark: '#0f172a', cursor: '#1e1e1e', oled: '#000000', light: '#f8fafc',
          };
          return (
            <TouchableOpacity
              key={key}
              style={[s.themeBtn, themeKey === key && { borderColor: theme.accent }]}
              onPress={() => setThemeKey(key)}
            >
              <View style={[s.themeDot, { backgroundColor: colors[key], borderWidth: key === 'light' ? 1 : 0, borderColor: theme.border }]} />
              <Text style={[s.themeBtnLabel, themeKey === key && { color: theme.accent }]}>{THEME_LABELS[key]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <GroupLabel label={t.settingsAccentColor} />
      <View style={[s.accentRow, { marginBottom: 16 }]}>
        {ACCENT_PRESETS.map((c) => (
          <TouchableOpacity key={c} style={[s.accentDot, { backgroundColor: c }, accent === c && s.accentDotActive]} onPress={() => setAccent(c)} />
        ))}
      </View>

      <GroupLabel label={t.settingsTransparency} />
      <Text style={[s.hintText, { marginBottom: 8 }]}>{t.settingsTransparencyHint}</Text>
      <View style={[s.glassPreview, cardSurface(true), { borderColor: theme.border, marginBottom: 12 }]}>
        <Text style={{ color: theme.text, fontWeight: '600' }}>{t.settingsTransparencyPreview}</Text>
        <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{t.settingsTransparencyPreviewHint}</Text>
      </View>
      <SettingSlider
        value={transparencyPct}
        min={0}
        max={100}
        step={1}
        onChange={setTransparencyPct}
        format={(v) => `${Math.round(v)}%`}
      />

      <GroupLabel label={t.settingsAnimSpeed} />
      <Text style={[s.hintText, { marginBottom: 4 }]}>{t.settingsAnimSpeedHint}</Text>
      <SettingSlider
        value={animationSpeed}
        min={0.5}
        max={2}
        step={0.1}
        onChange={setAnimationSpeed}
        format={(v) => `${Math.round(((v - 0.5) / 1.5) * 100)}%`}
      />
    </Section>
  );
}
