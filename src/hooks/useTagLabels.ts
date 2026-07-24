import { useCategoryLabels } from './useCategoryLabels';

/** @deprecated use useCategoryLabels */
export function useTagLabels(): Record<string, string> {
  return useCategoryLabels();
}
