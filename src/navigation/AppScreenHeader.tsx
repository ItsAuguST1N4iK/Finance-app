import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsNavStore } from '../store/settingsNavSlice';

function CrumbLabel({
  label,
  isLast,
  onPress,
}: {
  label: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const press = useRef(new Animated.Value(0)).current;
  const base = useRef(new Animated.Value(isLast ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(base, {
      toValue: isLast ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isLast, base]);

  const mix = Animated.add(base, press);
  const color = mix.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [theme.subtext, theme.accent, theme.accent],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.timing(press, { toValue: 1, duration: 90, useNativeDriver: false }).start();
      }}
      onPressOut={() => {
        Animated.timing(press, { toValue: 0, duration: 140, useNativeDriver: false }).start();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.Text
        style={[styles.crumbText, { color }, isLast && { fontWeight: '700' }]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/**
 * Page header: title OR breadcrumb trail (settings navigator) in the title slot.
 * Progress lives in AppProgressBar at the bottom.
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

  const scrollCrumbIntoView = useCallback((id: string) => {
    const layout = layoutsRef.current[id];
    const scroll = hScrollRef.current;
    if (!layout || !scroll) return;
    const vp = viewportW.current;
    const pad = 16;
    // Keep full label visible: align near left with pad; if wider than viewport, show end
    let x = Math.max(0, layout.x - pad);
    if (vp > 0 && layout.w + pad * 2 > vp) {
      x = Math.max(0, layout.x + layout.w + pad - vp);
    } else if (vp > 0 && layout.x + layout.w + pad > x + vp) {
      x = Math.max(0, layout.x + layout.w + pad - vp);
    }
    scroll.scrollTo({ x, animated: true });
  }, []);

  useEffect(() => {
    if (!showCrumbs || crumbs.length === 0) return;
    const last = crumbs[crumbs.length - 1]!;
    const t = setTimeout(() => scrollCrumbIntoView(last.id), 60);
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
                  <CrumbLabel
                    label={c.label}
                    isLast={isLast}
                    onPress={() => {
                      navigateToCrumb(c.id);
                      setTimeout(() => scrollCrumbIntoView(c.id), 30);
                    }}
                  />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
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
    fontWeight: '600',
  },
});
