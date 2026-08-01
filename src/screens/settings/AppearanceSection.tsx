import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ThemeKey, ACCENT_PRESETS } from '../../theme';
import { SettingSlider } from '../../components/SettingSlider';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedSwitch } from '../../components/AnimatedSwitch';
import {
  loadShowTabLabels,
  saveShowTabLabels,
} from '../../security/uiPrefs';
import { Section, GroupLabel } from './Section';
import type { SettingsStyles } from './settingsStyles';

export function AppearanceSection({ s }: { s: SettingsStyles }) {
  const {
    theme, themeKey, accent, setThemeKey, setAccent,
    animationSpeed, transparencyPct,
    setAnimationSpeed, setTransparencyPct,
  } = useTheme();
  const { t } = useLanguage();
  const [showTabLabels, setShowTabLabels] = useState(true);

  useEffect(() => {
    void loadShowTabLabels().then(setShowTabLabels);
  }, []);

  return (
    <Section title={t.settingsAppearance} icon="color-palette-outline" defaultExpanded>
      <GroupLabel label={t.settingsTheme} />
      <View style={[s.themeRow, { marginBottom: 10 }]}>
        {(['dark', 'cursor', 'oled', 'light'] as ThemeKey[]).map((key) => {
          const colors: Record<ThemeKey, string> = {
            dark: '#0f172a', cursor: '#1e1e1e', oled: '#000000', light: '#f8fafc',
          };
          return (
            <PressableScale
              key={key}
              style={[s.themeBtn, themeKey === key && { borderColor: theme.accent }]}
              contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }}
              onPress={() => setThemeKey(key)}
              scaleTo={0.96}
            >
              <View style={[s.themeDot, { backgroundColor: colors[key], borderWidth: key === 'light' ? 1 : 0, borderColor: theme.border }]} />
              <Text style={[s.themeBtnLabel, themeKey === key && { color: theme.accent }]}>
                {key === 'dark' ? t.themeLabelDark
                  : key === 'cursor' ? t.themeLabelCursor
                    : key === 'oled' ? t.themeLabelOled
                      : t.themeLabelLight}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <GroupLabel label={t.settingsAccentColor} />
      <View style={[s.accentRow, { marginBottom: 10 }]}>
        {ACCENT_PRESETS.map((c) => (
          <PressableScale
            key={c}
            onPress={() => setAccent(c)}
            scaleTo={0.88}
            contentStyle={[s.accentDot, { backgroundColor: c }, accent === c && s.accentDotActive]}
          >
            {null}
          </PressableScale>
        ))}
      </View>

      <GroupLabel label={t.settingsTabBar} />
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
            {t.settingsTabLabels}
          </Text>
          <Text style={[s.hintText, { marginTop: 4 }]}>{t.settingsTabLabelsHint}</Text>
        </View>
        <AnimatedSwitch
          value={showTabLabels}
          onValueChange={(v) => {
            setShowTabLabels(v);
            void saveShowTabLabels(v);
          }}
        />
      </View>

      <GroupLabel label={t.settingsTransparency} />
      <Text style={[s.hintText, { marginBottom: 4, color: theme.subtext }]}>{t.settingsTransparencyHint}</Text>
      <SettingSlider
        value={transparencyPct}
        min={0}
        max={100}
        step={1}
        onChange={setTransparencyPct}
        format={(v) => `${Math.round(v)}%`}
      />

      <GroupLabel label={t.settingsAnimSpeed} />
      <Text style={[s.hintText, { marginBottom: 4, color: theme.subtext }]}>{t.settingsAnimSpeedHint}</Text>
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
