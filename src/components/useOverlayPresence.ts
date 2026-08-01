import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { fps60, fpsEasing, speedMs } from '../theme/fps60';

type Phase = 'closed' | 'measuring' | 'opening' | 'open' | 'closing';

type Options = {
  visible: boolean;
  animationSpeed: number;
  fallbackHeight?: number;
  onClosed?: () => void;
};

/**
 * OPEN:  measure → shell slides up → content fades in
 * CLOSE: content fades → shell slides down → unmount
 * Fade→collapse chained on the UI thread (no JS gap).
 */
export function useOverlayPresence({
  visible,
  animationSpeed,
  fallbackHeight = 280,
  onClosed,
}: Options) {
  const [present, setPresent] = useState(false);
  const [heavy, setHeavy] = useState(false);
  const [phase, setPhase] = useState<Phase>('closed');
  const [clipH, setClipH] = useState(fallbackHeight);

  const presentRef = useRef(false);
  const genRef = useRef(0);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHRef = useRef(0);
  const openStartedRef = useRef(false);

  const backdropOpacity = useSharedValue(0);
  const reveal = useSharedValue(0);
  const shellHeight = useSharedValue(fallbackHeight);
  const contentOpacity = useSharedValue(0);

  const clearSafety = useCallback(() => {
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  }, []);

  const bumpGen = useCallback(() => {
    clearSafety();
    openStartedRef.current = false;
    return ++genRef.current;
  }, [clearSafety]);

  const isGen = useCallback((gen: number) => gen === genRef.current, []);

  const finishClosed = useCallback((gen: number) => {
    if (!isGen(gen)) return;
    genRef.current += 1;
    presentRef.current = false;
    openStartedRef.current = false;
    clearSafety();
    setHeavy(false);
    setPresent(false);
    setPhase('closed');
    backdropOpacity.value = 0;
    reveal.value = 0;
    contentOpacity.value = 0;
    lastHRef.current = 0;
    onClosed?.();
  }, [isGen, clearSafety, backdropOpacity, reveal, contentOpacity, onClosed]);

  const markOpen = useCallback((gen: number) => {
    if (!isGen(gen)) return;
    setPhase('open');
  }, [isGen]);

  const startOpenAnim = useCallback((gen: number) => {
    if (!isGen(gen) || openStartedRef.current) return;
    openStartedRef.current = true;
    setPhase('opening');

    const shellMs = speedMs(fps60.shell, animationSpeed);
    const backMs = speedMs(fps60.backdrop, animationSpeed);
    const inMs = speedMs(fps60.contentIn, animationSpeed);

    cancelAnimation(backdropOpacity);
    cancelAnimation(reveal);
    cancelAnimation(contentOpacity);

    contentOpacity.value = 0;
    backdropOpacity.value = 0;
    reveal.value = 0;

    backdropOpacity.value = withTiming(1, {
      duration: backMs,
      easing: fpsEasing.out,
    });

    reveal.value = withTiming(1, {
      duration: shellMs,
      easing: fpsEasing.out,
    }, (finished) => {
      if (!finished) return;
      contentOpacity.value = withTiming(1, {
        duration: inMs,
        easing: fpsEasing.out,
      }, (done) => {
        if (done) runOnJS(markOpen)(gen);
      });
    });

    clearSafety();
    safetyRef.current = setTimeout(
      () => markOpen(gen),
      shellMs + inMs + 80,
    );
  }, [
    isGen, animationSpeed, backdropOpacity, reveal, contentOpacity,
    markOpen, clearSafety,
  ]);

  useEffect(() => {
    if (visible) {
      const gen = bumpGen();
      presentRef.current = true;
      setPhase('measuring');

      const targetH = lastHRef.current > 0 ? lastHRef.current : fallbackHeight;
      shellHeight.value = targetH;
      setClipH(targetH);

      contentOpacity.value = 0;
      backdropOpacity.value = 0;
      reveal.value = 0;

      setHeavy(true);
      setPresent(true);

      // If we already know height, open immediately; else wait one frame for onLayout
      if (lastHRef.current > 0) {
        requestAnimationFrame(() => startOpenAnim(gen));
      } else {
        clearSafety();
        safetyRef.current = setTimeout(() => startOpenAnim(gen), 48);
      }
      return;
    }

    if (!presentRef.current) return;
    const gen = bumpGen();
    setPhase('closing');

    const outMs = speedMs(fps60.contentOut, animationSpeed);
    const shellMs = speedMs(fps60.shell, animationSpeed);
    const backMs = speedMs(fps60.backdrop, animationSpeed);

    cancelAnimation(contentOpacity);
    cancelAnimation(reveal);
    cancelAnimation(backdropOpacity);

    contentOpacity.value = withTiming(0, {
      duration: outMs,
      easing: fpsEasing.in,
    }, (finished) => {
      if (!finished) return;
      reveal.value = withTiming(0, {
        duration: shellMs,
        easing: fpsEasing.inOut,
      });
      backdropOpacity.value = withTiming(0, {
        duration: Math.max(backMs, shellMs),
        easing: fpsEasing.in,
      }, (done) => {
        if (done) runOnJS(finishClosed)(gen);
      });
    });

    clearSafety();
    safetyRef.current = setTimeout(
      () => finishClosed(gen),
      outMs + Math.max(shellMs, backMs) + 120,
    );
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    bumpGen();
  }, [bumpGen]);

  const noteShellHeight = useCallback((h: number) => {
    if (h <= 0 || h < 48) return;

    const prev = lastHRef.current;
    const changed = prev <= 0 || Math.abs(prev - h) > 4;

    if (!changed) {
      shellHeight.value = prev;
      return;
    }

    lastHRef.current = h;
    shellHeight.value = h;

    if (phase === 'closing') return;

    // Grow clip freely; avoid shrinking mid-open (layout thrash / “UI expands weirdly”).
    if ((phase === 'opening' || phase === 'open') && prev > 0 && h + 4 < prev) {
      return;
    }
    setClipH(h);

    if (phase === 'measuring' && presentRef.current) {
      startOpenAnim(genRef.current);
    }
  }, [shellHeight, phase, startOpenAnim]);

  return {
    present,
    heavy,
    phase,
    closing: phase === 'closing',
    clipH,
    noteShellHeight,
    backdropOpacity,
    reveal,
    shellHeight,
    contentOpacity,
  };
}

export type OverlayShared = {
  backdropOpacity: SharedValue<number>;
  reveal: SharedValue<number>;
  shellHeight: SharedValue<number>;
  contentOpacity: SharedValue<number>;
};
