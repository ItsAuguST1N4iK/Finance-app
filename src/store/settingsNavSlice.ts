import { create } from 'zustand';

export interface BreadcrumbCrumb {
  id: string;
  label: string;
}

interface SettingsNavState {
  crumbs: BreadcrumbCrumb[];
  /** Latest window-Y from measureInWindow (remeasured before scroll). */
  targets: Record<string, number>;
  pendingScrollId: string | null;
  /** Bumped when panels must expand before scroll. */
  expandSeq: number;
  /** Crumb ids that should be forced open before scrolling. */
  expandIds: string[];

  setCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
  registerTarget: (id: string, y: number) => void;
  /** Navigate via breadcrumb: pop trail after id, expand ancestors, scroll. */
  navigateToCrumb: (id: string) => void;
  requestScrollTo: (id: string) => void;
  clearPendingScroll: () => void;
  clear: () => void;
}

export const useSettingsNavStore = create<SettingsNavState>((set, get) => ({
  crumbs: [],
  targets: {},
  pendingScrollId: null,
  expandSeq: 0,
  expandIds: [],

  setCrumbs: (crumbs) => set({ crumbs }),

  registerTarget: (id, y) => set((s) => ({ targets: { ...s.targets, [id]: y } })),

  navigateToCrumb: (id) => {
    const { crumbs } = get();
    if (id === 'settings') {
      const root = crumbs[0]?.id === 'settings'
        ? [crumbs[0]]
        : crumbs.length > 0
          ? [{ id: 'settings', label: crumbs[0]!.label }]
          : [];
      set({
        crumbs: root.length ? root : crumbs.slice(0, 1),
        pendingScrollId: 'settings',
        expandIds: [],
        expandSeq: get().expandSeq + 1,
      });
      return;
    }

    const idx = crumbs.findIndex((c) => c.id === id);
    if (idx < 0) {
      set({ pendingScrollId: id, expandSeq: get().expandSeq + 1 });
      return;
    }
    const nextCrumbs = crumbs.slice(0, idx + 1);
    const expandIds = nextCrumbs
      .map((c) => c.id)
      .filter((cid) => cid !== 'settings');
    set({
      crumbs: nextCrumbs,
      pendingScrollId: id,
      expandIds,
      expandSeq: get().expandSeq + 1,
    });
  },

  requestScrollTo: (id) => set({ pendingScrollId: id }),

  clearPendingScroll: () => set({ pendingScrollId: null, expandIds: [] }),

  clear: () => set({
    crumbs: [],
    pendingScrollId: null,
    expandIds: [],
    targets: {},
  }),
}));
