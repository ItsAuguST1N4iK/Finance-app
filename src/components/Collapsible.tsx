import React, { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { fps60, fpsEasing, speedMs } from '../theme/fps60';

type Props = {
  expanded: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onClosed?: () => void;
  /** @deprecated Ignored */
  chunkSize?: number;
  /** @deprecated Ignored */
  eager?: boolean;
};

/**
 * Spacer height releases ScrollView space; content is absolute (no per-frame reflow).
 * Visual collapse = translateY inside the clipping spacer (top→bottom).
 * OPEN: expand → fade in. CLOSE: fade out → collapse → unmount. Chained on UI thread.
 */
export function Collapsible({
  expanded,
  children,
  style,
  contentStyle,
  onClosed,
}: Props) {
  const { animationSpeed } = useTheme();
  const [mounted, setMounted] = useState(expanded);
  const [heavy, setHeavy] = useState(expanded);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  const progress = useSharedValue(expanded ? 1 : 0);
  const contentOpacity = useSharedValue(expanded ? 1 : 0);
  const measured = useSharedValue(0);
  const cachedH = useRef(0);
  const genRef = useRef(0);
  const pendingOpen = useRef(false);
  const skipAnim = useRef(expanded);

  const shellMs = speedMs(fps60.collapseShell, animationSpeed);
  const fadeInMs = speedMs(fps60.contentIn, animationSpeed);
  const fadeOutMs = speedMs(fps60.contentOut, animationSpeed);

  function finishClosed(gen: number) {
    if (gen !== genRef.current) return;
    setHeavy(false);
    setMounted(false);
    pendingOpen.current = false;
    onClosedRef.current?.();
  }

  function runOpen(gen: number, h: number) {
    if (gen !== genRef.current || h <= 0) return;
    cachedH.current = h;
    measured.value = h;

    if (skipAnim.current) {
      skipAnim.current = false;
      progress.value = 1;
      contentOpacity.value = 1;
      return;
    }

    progress.value = 0;
    contentOpacity.value = 0;
    progress.value = withTiming(1, {
      duration: shellMs,
      easing: fpsEasing.out,
    }, (finished) => {
      if (!finished) return;
      contentOpacity.value = withTiming(1, {
        duration: fadeInMs,
        easing: fpsEasing.out,
      });
    });
  }

  useEffect(() => {
    const gen = ++genRef.current;
    cancelAnimation(progress);
    cancelAnimation(contentOpacity);

    if (expanded) {
      setMounted(true);
      setHeavy(true);
      contentOpacity.value = skipAnim.current ? 1 : 0;
      pendingOpen.current = true;

      if (cachedH.current > 0) {
        pendingOpen.current = false;
        runOpen(gen, cachedH.current);
      }
      return () => {
        cancelAnimation(progress);
        cancelAnimation(contentOpacity);
      };
    }

    if (!mounted) return;
    skipAnim.current = false;

    contentOpacity.value = withTiming(0, {
      duration: fadeOutMs,
      easing: fpsEasing.in,
    }, (finished) => {
      if (!finished) return;
      progress.value = withTiming(0, {
        duration: shellMs,
        easing: fpsEasing.inOut,
      }, (done) => {
        if (done) runOnJS(finishClosed)(gen);
      });
    });

    return () => {
      cancelAnimation(progress);
      cancelAnimation(contentOpacity);
    };
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const spacerStyle = useAnimatedStyle(() => {
    const h = measured.value;
    if (h <= 0) return { height: 0, overflow: 'hidden' as const };
    return {
      height: h * progress.value,
      overflow: 'hidden' as const,
    };
  });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * measured.value }],
  }));

  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!mounted && !expanded) return null;

  return (
    <Animated.View
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[spacerStyle, style]}
    >
      <Animated.View
        collapsable={false}
        style={[
          { position: 'absolute', left: 0, right: 0, top: 0 },
          panelStyle,
        ]}
        onLayout={(e) => {
          const h = Math.ceil(e.nativeEvent.layout.height);
          if (h <= 0) return;

          if (pendingOpen.current && expanded) {
            pendingOpen.current = false;
            const gen = genRef.current;
            requestAnimationFrame(() => runOpen(gen, h));
            return;
          }

          if (heavy && expanded && Math.abs(cachedH.current - h) > 2) {
            // Only adopt new height after open animation finished (avoids layout thrash)
            if (progress.value >= 0.99) {
              cachedH.current = h;
              measured.value = h;
            }
          }
        }}
      >
        {heavy ? (
          <Animated.View style={[contentFadeStyle, contentStyle]}>
            {children}
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}
