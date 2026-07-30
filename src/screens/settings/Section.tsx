import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { radius, space, type } from '../../theme/tokens';
import { sectionLabelStyle } from '../../theme/commonStyles';
import { useSettingsNavStore } from '../../store/settingsNavSlice';

interface SectionProps {
  title: string;
  icon: string;
  badge?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  crumbId?: string;
  onExpandChange?: (expanded: boolean) => void;
}

export function Section({
  title, icon, badge, defaultExpanded = false, children, crumbId, onExpandChange,
}: SectionProps) {
  const { theme, dur, cardSurface } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyOpacity = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(bodyOpacity, {
      toValue: next ? 1 : 0,
      duration: dur(220),
      useNativeDriver: true,
    }).start();
    setExpanded(next);
    if (notify) onExpandChange?.(next);
    if (next) setTimeout(measure, 280);
  }, [expanded, bodyOpacity, dur, onExpandChange, measure]);

  // Force-expand when breadcrumb navigates here
  useEffect(() => {
    if (!crumbId || expandIds.length === 0) return;
    if (expandIds.includes(crumbId)) {
      if (!expanded) expandTo(true, false);
      else setTimeout(measure, 40);
    }
  }, [expandSeq, expandIds, crumbId, expanded, expandTo, measure]);

  function toggle() {
    expandTo(!expanded, true);
  }

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      onLayout={measure}
      style={[secS.container, surface, { borderColor: theme.border }]}
    >
      <TouchableOpacity style={secS.header} onPress={toggle} activeOpacity={0.7}>
        <View style={secS.headerLeft}>
          <View style={[secS.iconWrap, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name={icon as any} size={16} color={theme.accent} />
          </View>
          <Text style={[secS.title, { color: theme.text }]}>{title}</Text>
          {badge && (
            <View style={[secS.badge, { backgroundColor: theme.accent + '33' }]}>
              <Text style={[secS.badgeText, { color: theme.accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subtext} />
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={[secS.body, { borderTopColor: theme.border, opacity: bodyOpacity }]}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

const secS = StyleSheet.create({
  container: { borderRadius: radius.lg, borderWidth: 1, marginBottom: space[2.5], overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[4] },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2.5], flex: 1 },
  iconWrap: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.body, fontWeight: '600', flex: 1 },
  badge: { borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  body: { borderTopWidth: 1, padding: space[4] },
});

export function GroupLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={sectionLabelStyle(theme.subtext, space[2])}>{label}</Text>;
}
