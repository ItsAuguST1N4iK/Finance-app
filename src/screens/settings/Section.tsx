import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import { Collapsible } from '../../components/Collapsible';
import { ChevronToggle } from '../../components/MotionIcons';
import { radius, space, stroke, type } from '../../theme/tokens';
import { sectionLabelStyle } from '../../theme/commonStyles';
import { useSettingsNavStore } from '../../store/settingsNavSlice';

interface SectionProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  badge?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  crumbId?: string;
  onExpandChange?: (expanded: boolean) => void;
}

export function Section({
  title, icon, badge, defaultExpanded = false, children, crumbId, onExpandChange,
}: SectionProps) {
  const { theme, cardSurface } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const surface = cardSurface();
  const registerTarget = useSettingsNavStore((s) => s.registerTarget);
  const expandSeq = useSettingsNavStore((s) => s.expandSeq);
  const expandIds = useSettingsNavStore((s) => s.expandIds);
  const wrapRef = useRef<View>(null);

  const measure = useCallback(() => {
    if (!crumbId || !wrapRef.current) return;
    wrapRef.current.measureInWindow((_x, y) => {
      registerTarget(crumbId, y);
    });
  }, [crumbId, registerTarget]);

  const expandTo = useCallback((next: boolean, notify = true) => {
    if (next === expanded) {
      if (next) measure();
      return;
    }
    setExpanded(next);
    if (notify) onExpandChange?.(next);
    if (next) setTimeout(measure, 80 + 20);
  }, [expanded, onExpandChange, measure]);

  useEffect(() => {
    if (!crumbId || expandIds.length === 0) return;
    if (expandIds.includes(crumbId)) {
      if (!expanded) expandTo(true, false);
      else setTimeout(measure, 40);
    }
  }, [expandSeq, expandIds, crumbId, expanded, expandTo, measure]);

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      onLayout={measure}
      style={[secS.container, surface, { borderColor: theme.border }]}
    >
      <PressableScale style={secS.header} contentStyle={secS.headerInner} onPress={() => expandTo(!expanded, true)} scaleTo={0.985}>
        <View style={secS.headerLeft}>
          <View style={[secS.iconWrap, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name={icon} size={16} color={theme.accent} />
          </View>
          <Text style={[secS.title, { color: theme.text }]}>{title}</Text>
          {badge && (
            <View style={[secS.badge, { backgroundColor: theme.accent + '33' }]}>
              <Text style={[secS.badgeText, { color: theme.accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        <ChevronToggle expanded={expanded} size={18} color={theme.accent} />
      </PressableScale>
      <Collapsible
        expanded={expanded}
        contentStyle={[secS.body, { borderTopColor: theme.border }]}
      >
        {children}
      </Collapsible>
    </View>
  );
}

const secS = StyleSheet.create({
  container: { borderRadius: radius.lg, borderWidth: stroke.width, marginBottom: space[2], overflow: 'hidden' },
  header: { padding: space[3] + 2 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2.5], flex: 1 },
  iconWrap: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.body, fontWeight: '600', flex: 1 },
  badge: { borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  body: { borderTopWidth: stroke.hairline, padding: space[3] },
});

export function GroupLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={[sectionLabelStyle(theme.subtext), { marginBottom: 6, marginTop: 4 }]}>{label}</Text>;
}
