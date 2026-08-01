import { useAppProgressStore } from '../store/appProgressSlice';
import { ensureEssentialCategoryRules, loadCategoryRules } from '../utils/categoryRules';
import type { CategoryRule } from '../utils/categoryRules';
import { setImportCategoryRulesCache } from '../utils/categoryDetect';
import { retagAllTransactions } from '../utils/retagTransactions';
import { refreshAppData } from './refreshAppData';
import type { Account } from '../types';
import { getLanguage } from '../db/repos/settings';
import { TRANSLATIONS } from '../i18n';

export type ImportJobKind = 'scraper' | 'retag';

export interface ImportJob {
  id: string;
  /** Display name, e.g. "Monobank CSV" */
  label: string;
  kind: ImportJobKind;
  /**
   * Run the job. Call `onProgress(current, total, detail?)` for UI updates.
   * Rules cache is prepared before scraper jobs.
   */
  run: (onProgress: (current: number, total: number, detail?: string) => void) => Promise<void>;
}

interface QueueState {
  queue: ImportJob[];
  active: ImportJob | null;
  /** Schedule one retag after the current scraper batch drains */
  retagAfterBatch: boolean;
  retagAccounts: Account[];
}

const state: QueueState = {
  queue: [],
  active: null,
  retagAfterBatch: false,
  retagAccounts: [],
};

let pumping = false;

function retagProgressLabel(): string {
  const lang = getLanguage();
  return TRANSLATIONS[lang === 'en' ? 'en' : 'uk'].appProgressRetag;
}

function publish(
  step: string,
  current: number,
  total: number,
  detail?: string,
) {
  useAppProgressStore.getState().setProgress({
    step,
    current,
    total: Math.max(1, total),
    detail,
    queueLeft: state.queue.length,
  });
}

function prepareRulesCache(): CategoryRule[] {
  ensureEssentialCategoryRules();
  const rules = loadCategoryRules();
  setImportCategoryRulesCache(rules);
  return rules;
}

async function runRetagJob(accounts: Account[]): Promise<void> {
  const label = retagProgressLabel();
  prepareRulesCache();
  publish(label, 0, 1, 'rules');
  await new Promise<void>((r) => setTimeout(r, 32));
  await retagAllTransactions(accounts, (current, total, detail) => {
    publish(label, current, total, detail);
  });
  publish(label, 1, 1, 'done');
  await refreshAppData('all');
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;

  try {
    while (state.queue.length > 0 || state.retagAfterBatch) {
      const next = state.queue.shift();
      if (next) {
        state.active = next;
        try {
          if (next.kind === 'scraper') {
            prepareRulesCache();
          }
          await next.run((current, total, detail) => {
            publish(next.label, current, total, detail);
          });
        } catch (e) {
          console.warn('[importJobQueue]', next.label, e);
          // Continue with remaining jobs — one failed import must not block the queue
        } finally {
          state.active = null;
        }
        continue;
      }

      if (state.retagAfterBatch) {
        state.retagAfterBatch = false;
        const accounts = state.retagAccounts;
        const label = retagProgressLabel();
        state.active = {
          id: `retag_${Date.now()}`,
          label,
          kind: 'retag',
          run: async () => {},
        };
        try {
          await runRetagJob(accounts);
        } catch (e) {
          console.warn('[importJobQueue] retag failed', e);
        } finally {
          state.active = null;
        }
      }
    }
  } finally {
    pumping = false;
    setImportCategoryRulesCache(null);
    useAppProgressStore.getState().clearProgress(700);
  }
}

/**
 * Enqueue a scraper/import job. Jobs run one-by-one.
 * After all scraper jobs finish, a single retag runs if `scheduleRetag` was requested.
 */
export function enqueueImportJob(
  job: Omit<ImportJob, 'id'> & { id?: string },
  opts?: { scheduleRetag?: boolean; accounts?: Account[] },
): void {
  state.queue.push({
    id: job.id ?? `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: job.label,
    kind: job.kind,
    run: job.run,
  });
  if (opts?.scheduleRetag) {
    state.retagAfterBatch = true;
    if (opts.accounts) state.retagAccounts = opts.accounts;
  }
  void pump();
}

/** Request retag after currently queued scrapers (or immediately if idle). */
export function enqueueRetagAfterScrapers(accounts: Account[]): void {
  state.retagAfterBatch = true;
  state.retagAccounts = accounts;
  void pump();
}

export function getImportQueueLength(): number {
  return state.queue.length + (state.active ? 1 : 0);
}
