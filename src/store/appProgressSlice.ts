import { create } from 'zustand';

/** Global long-running job progress — compact chip in nav header (non-blocking). */
export interface AppProgress {
  /** Short label, e.g. "Monobank CSV" or "Автотегування" */
  step: string;
  /** Processed units (transactions / stages) */
  current: number;
  /** Total units */
  total: number;
  /** Optional detail under the bar */
  detail?: string;
  /** Jobs still waiting in the import queue (excluding the active one) */
  queueLeft?: number;
}

interface AppProgressState {
  progress: AppProgress | null;
  setProgress: (p: AppProgress | null) => void;
  updateProgress: (partial: Partial<AppProgress>) => void;
  clearProgress: (delayMs?: number) => void;
}

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppProgressStore = create<AppProgressState>((set, get) => ({
  progress: null,

  setProgress: (p) => {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    set({ progress: p });
  },

  updateProgress: (partial) => {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    const cur = get().progress;
    if (!cur) {
      set({
        progress: {
          step: partial.step ?? '',
          current: partial.current ?? 0,
          total: partial.total ?? 1,
          detail: partial.detail,
          queueLeft: partial.queueLeft,
        },
      });
      return;
    }
    set({ progress: { ...cur, ...partial } });
  },

  clearProgress: (delayMs = 0) => {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    if (delayMs <= 0) {
      set({ progress: null });
      return;
    }
    clearTimer = setTimeout(() => {
      set({ progress: null });
      clearTimer = null;
    }, delayMs);
  },
}));
