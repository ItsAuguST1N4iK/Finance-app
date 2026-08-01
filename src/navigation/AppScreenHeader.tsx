import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsNavStore } from '../store/settingsNavSlice';
import { PressableScale } from '../components/PressableScale';

/**
 * Full-bleed page header (no floating island / side cutouts).
 * Status area uses the same solid header background as the title row.
 */
export function AppScreenHeader({ title }: { title?: string }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const crumbs = useSettingsNavStore((s) => s.crumbs);
  const navigateToCrumb = useSettingsNavStore((s) => s.navigateToCrumb);
  const hScrollRef = useRef<ScrollView>(null);
  const layoutsRef = useRef<Record<string, { x: number; w: number }>>({});
  const viewportW = useRef(0);

  const showCrumbs = crumbs.length > 0;
  const multi = crumbs.length > 1;

  const scrollCrumbIntoView = useCallback((id: string, align: 'start' | 'end' = 'end') => {
    const layout = layoutsRef.current[id];
    const scroll = hScrollRef.current;
    if (!layout || !scroll) return;
    const vp = viewportW.current;
    const pad = 12;
    let x: number;
    if (align === 'start') {
      x = Math.max(0, layout.x - pad);
    } else if (vp > 0) {
      x = Math.max(0, layout.x + layout.w + pad - vp);
    } else {
      x = Math.max(0, layout.x - pad);
    }
    scroll.scrollTo({ x, animated: true });
  }, []);

  useEffect(() => {
    if (!showCrumbs || crumbs.length === 0) return;
    const last = crumbs[crumbs.length - 1]!;
    const t = setTimeout(() => scrollCrumbIntoView(last.id, 'end'), 50);
    return () => clearTimeout(t);
  }, [crumbs, showCrumbs, scrollCrumbIntoView]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          backgroundColor: theme.header,
          borderBottomColor: theme.border,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.titleRow} pointerEvents="box-none">
        {showCrumbs ? (
          <ScrollView
            ref={hScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.crumbScroll}
            contentContainerStyle={styles.crumbContent}
            onLayout={(e) => { viewportW.current = e.nativeEvent.layout.width; }}
          >
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              const idleColor = !multi || !isLast ? theme.text : theme.accent;
              return (
                <View
                  key={`${c.id}_${i}`}
                  style={styles.crumbItem}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    layoutsRef.current[c.id] = { x, w: width };
                  }}
                >
                  {i > 0 && (
                    <Text style={[styles.crumbSep, { color: theme.subtext }]}> › </Text>
                  )}
                  <PressableScale
                    onPress={() => {
                      navigateToCrumb(c.id);
                      setTimeout(() => scrollCrumbIntoView(c.id, 'start'), 40);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    scaleTo={0.96}
                  >
                    <Text
                      style={[
                        styles.crumbText,
                        {
                          color: idleColor,
                          fontWeight: isLast && multi ? '700' : '600',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {c.label}
                    </Text>
                  </PressableScale>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title ?? ''}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  crumbScroll: {
    flexGrow: 0,
  },
  crumbContent: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 28,
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbSep: {
    fontSize: 15,
    fontWeight: '500',
  },
  crumbText: {
    fontSize: 16,
  },
});
