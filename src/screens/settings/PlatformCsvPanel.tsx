import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useSettingsNavStore } from '../../store/settingsNavSlice';

export function PlatformCsvPanel({
  title,
  children,
  defaultExpanded = false,
  crumbId,
  parentCrumbId: _parentCrumbId,
  onExpandChange,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  crumbId?: string;
  parentCrumbId?: string;
  onExpandChange?: (expanded: boolean) => void;
}) {
  const { theme, dur, cardSurface } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyOpacity = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const surface = cardSurface(true);
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
      style={[{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }, surface]}
    >
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}
        onPress={toggle}
        activeOpacity={0.75}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{title}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subtext} />
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, opacity: bodyOpacity }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}
