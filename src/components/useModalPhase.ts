import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { motion } from '../theme/motion';

export type ModalPhase = 'closed' | 'opening' | 'open' | 'closing';

type TimingOpts = {
  duration: number;
  easing?: typeof motion.easeOut;
  useNativeDriver?: boolean;
};

/**
 * Presence + generation token for sequenced open/close.
 * Components own the fade → collapse / expand → fade choreography.
 */
export function useModalPhase(visible: boolean) {
  const [phase, setPhase] = useState<ModalPhase>('closed');
  const [heavy, setHeavy] = useState(false);
  const phaseRef = useRef<ModalPhase>('closed');
  const genRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const rafRef = useRef<number | null>(null);

  const setPhaseSafe = useCallback((next: ModalPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const nextGen = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animRef.current?.stop();
    animRef.current = null;
    return ++genRef.current;
  }, []);

  const isCurrent = useCallback((gen: number) => genRef.current === gen, []);

  const run = useCallback((gen: number, anim: Animated.CompositeAnimation, onDone?: () => void) => {
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (!finished || !isCurrent(gen)) return;
      animRef.current = null;
      onDone?.();
    });
  }, [isCurrent]);

  useEffect(() => () => {
    nextGen();
  }, [nextGen]);

  return {
    phase,
    phaseRef,
    present: phase !== 'closed',
    isClosing: phase === 'closing',
    isOpening: phase === 'opening',
    heavy,
    setHeavy,
    setPhaseSafe,
    nextGen,
    isCurrent,
    run,
    genRef,
  };
}

export function timing(
  value: Animated.Value,
  toValue: number,
  { duration, easing = motion.easeOutSoft, useNativeDriver = true }: TimingOpts,
) {
  return Animated.timing(value, {
    toValue,
    duration,
    easing,
    useNativeDriver,
  });
}
