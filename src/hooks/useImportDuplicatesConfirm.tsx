import React from 'react';
import type { UnifiedTransaction } from '../types';
import { ImportDuplicatesModal } from '../components/ImportDuplicatesModal';

export interface DupConfirmPayload {
  title: string;
  message: string;
  duplicates: UnifiedTransaction[];
  onCancel: () => void;
  onAddWithoutDuplicates: () => void;
  onAddWithDuplicates: (selected: UnifiedTransaction[]) => void;
}

export type DupConfirmShow = (payload: DupConfirmPayload) => void;

export function useImportDuplicatesConfirm() {
  const [state, setState] = React.useState<DupConfirmPayload | null>(null);

  const showDupConfirm: DupConfirmShow = React.useCallback((payload) => {
    setState(payload);
  }, []);

  function hide() {
    setState(null);
  }

  const element = (
    <ImportDuplicatesModal
      visible={!!state}
      title={state?.title ?? ''}
      message={state?.message ?? ''}
      duplicates={state?.duplicates ?? []}
      onCancel={() => {
        const cb = state?.onCancel;
        hide();
        cb?.();
      }}
      onAddWithoutDuplicates={() => {
        const cb = state?.onAddWithoutDuplicates;
        hide();
        cb?.();
      }}
      onAddWithDuplicates={(selected) => {
        const cb = state?.onAddWithDuplicates;
        hide();
        cb?.(selected);
      }}
    />
  );

  return { showDupConfirm, element };
}
