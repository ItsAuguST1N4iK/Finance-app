import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import { Collapsible } from '../../components/Collapsible';
import { ChevronToggle } from '../../components/MotionIcons';
import { useSettingsNavStore } from '../../store/settingsNavSlice';
import { stroke } from '../../theme/tokens';

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
  const { theme, cardSurface } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const surface = cardSurface(true);
  const registerTarget = useSettingsNavStore((s) => s.registerTarget);
  const expandSeq = useSettingsNavStore((s) => s.expandSeq);
  const expandIds = useSettingsNavStore((s) => s.expandIds);
  const exclusivePanelId = useSettingsNavStore((s) => s.exclusivePanelId);
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

  useEffect(() => {
    if (!crumbId || !exclusivePanelId) return;
    if (exclusivePanelId !== crumbId && expanded) {
      expandTo(false, false);
    }
  }, [exclusivePanelId, crumbId, expanded, expandTo]);

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      onLayout={measure}
      style={[styles.wrap, surface, { borderColor: theme.border }]}
    >
      <PressableScale
        style={styles.header}
        contentStyle={styles.headerInner}
        onPress={() => expandTo(!expanded, true)}
        scaleTo={0.985}
      >
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        <ChevronToggle expanded={expanded} size={16} color={theme.accent} />
      </PressableScale>
      <Collapsible
        expanded={expanded}
        contentStyle={[styles.body, { borderTopColor: theme.border }]}
      >
        {children}
      </Collapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: stroke.width,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
});
